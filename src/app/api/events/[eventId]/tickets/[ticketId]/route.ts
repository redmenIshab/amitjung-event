import { NextResponse } from 'next/server'
import { requireEventApiCapability } from '@/lib/eventAccess'
import { prisma } from '@/lib/prisma'
import { ticketReasonSchema } from '@/lib/validations'
import { actorFromSession, recordTicketActivity } from '@/lib/ticketActivity'

type Params = { params: Promise<{ eventId: string; ticketId: string }> }

/**
 * Cancels one ticket.
 *
 * Until this existed, nothing in the app could write TicketStatus.CANCELLED —
 * the enum value was read everywhere and set nowhere.
 */
export async function PATCH(request: Request, { params }: Params) {
  const { eventId, ticketId } = await params
  const gate = await requireEventApiCapability('TICKET_MANAGE', eventId)
  if (gate instanceof NextResponse) return gate

  const body = await request.json().catch(() => ({}))
  const parsed = ticketReasonSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // Scoped by eventId as well as id, so a ticket id from another event reads as
  // "not found" rather than being cancelled through the wrong event's URL.
  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, eventId },
    select: { id: true, eventId: true, status: true },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (ticket.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Ticket is already cancelled' }, { status: 409 })
  }

  // Cancelling an already-scanned ticket is allowed: someone physically walked
  // in, and the admin may still need to void the ticket. It is recorded as an
  // override rather than refused or quietly normalised.
  const wasUsed = ticket.status === 'USED'

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.ticket.update({
      where: { id: ticket.id },
      data: { status: 'CANCELLED' },
    })
    await recordTicketActivity(tx, {
      eventId,
      action: 'CANCELLED',
      ticketId: ticket.id,
      reason: parsed.data.reason,
      actor: actorFromSession(gate.session),
      ...(wasUsed ? { meta: { wasUsed: true } } : {}),
    })
    return result
  })

  return NextResponse.json({ ticket: updated, wasUsed })
}
