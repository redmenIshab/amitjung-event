import { NextResponse } from 'next/server'
import { requireEventApiCapability } from '@/lib/eventAccess'
import { prisma } from '@/lib/prisma'
import { ticketReasonSchema } from '@/lib/validations'
import { actorFromSession, recordTicketActivity } from '@/lib/ticketActivity'

type Params = { params: Promise<{ eventId: string; ticketId: string }> }

/**
 * Marks the payment behind a ticket as refunded, and cancels every ticket it
 * paid for.
 *
 * The cascade is the point: refunding without cancelling would leave a refunded
 * buyer able to walk through the door, and the scanner would have no idea.
 *
 * This records that a refund happened. Money moves out of band through Khalti's
 * own dashboard — there is no refund API call here.
 *
 * Reached from the ticket row because the Control Center has no payments UI;
 * that is where an admin already is when a buyer asks for their money back.
 */
export async function POST(request: Request, { params }: Params) {
  const { eventId, ticketId } = await params
  const gate = await requireEventApiCapability('REFUND_MANAGE', eventId)
  if (gate instanceof NextResponse) return gate

  const body = await request.json().catch(() => ({}))
  const parsed = ticketReasonSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, eventId },
    select: {
      id: true,
      booking: {
        select: {
          payment: { select: { id: true, finalAmount: true, paymentStatus: true } },
        },
      },
    },
  })
  if (!ticket?.booking?.payment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const payment = ticket.booking.payment
  if (payment.paymentStatus === 'REFUND') {
    return NextResponse.json({ error: 'This payment is already refunded' }, { status: 409 })
  }
  // ensureSystemBooking mints a zero-value payment for comped tickets. There is
  // no money to give back, so refunding one is meaningless rather than merely
  // unusual — refuse it instead of writing a NPR 0 refund into the ledger.
  if (payment.finalAmount === 0) {
    return NextResponse.json(
      { error: 'This ticket was issued at no charge, so there is nothing to refund' },
      { status: 409 },
    )
  }

  const actor = actorFromSession(gate.session)

  const result = await prisma.$transaction(async (tx) => {
    const affected = await tx.ticket.findMany({
      where: { booking: { paymentId: payment.id }, status: { not: 'CANCELLED' } },
      select: { id: true, status: true },
    })
    const ids = affected.map((t) => t.id)
    // Counted, never reverted: a USED ticket means someone was admitted, and
    // rewriting that would be falsifying the record.
    const alreadyUsed = affected.filter((t) => t.status === 'USED').length

    await tx.payment.update({
      where: { id: payment.id },
      data: { paymentStatus: 'REFUND' },
    })

    if (ids.length > 0) {
      await tx.ticket.updateMany({
        where: { id: { in: ids } },
        data: { status: 'CANCELLED' },
      })
    }

    await recordTicketActivity(tx, {
      eventId,
      action: 'REFUNDED',
      ticketId: ticket.id,
      paymentId: payment.id,
      amount: payment.finalAmount,
      reason: parsed.data.reason,
      actor,
      ...(alreadyUsed > 0 ? { meta: { alreadyUsed } } : {}),
    })

    if (ids.length > 0) {
      await recordTicketActivity(tx, {
        eventId,
        action: 'CANCELLED',
        paymentId: payment.id,
        quantity: ids.length,
        reason: parsed.data.reason,
        actor,
        meta: { refundCascade: true },
      })
    }

    return { cancelled: ids.length, alreadyUsed }
  })

  return NextResponse.json({
    paymentId: payment.id,
    amount: payment.finalAmount,
    ...result,
  })
}
