import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { requireEventApiCapability } from '@/lib/eventAccess'
import { prisma } from '@/lib/prisma'
import { generateTicketSchema } from '@/lib/validations'
import { generateQRCodeDataURL, buildVerifyUrl } from '@/lib/qr'
import { sendTicketEmail, isEmailEnabled } from '@/lib/email'
import { ensureSystemBooking } from '@/lib/ticketing'
import { actorFromSession, recordTicketActivity } from '@/lib/ticketActivity'

type Params = { params: Promise<{ eventId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { eventId } = await params
  // Attendee PII: EVENT_READ scoped to this event, so an organizer cannot read
  // another event's attendee list.
  const gate = await requireEventApiCapability('EVENT_READ', eventId)
  if (gate instanceof NextResponse) return gate
  const tickets = await prisma.ticket.findMany({
    where: { eventId },
    include: { checkIn: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(tickets)
}

export async function POST(request: Request, { params }: Params) {
  const gate = await requireApiCapability('TICKET_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { eventId } = await params
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await request.json()
  const parsed = generateTicketSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const bookingId = await ensureSystemBooking(eventId)

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        eventId,
        bookingId,
        attendeeName: parsed.data.attendeeName,
        attendeeEmail: parsed.data.attendeeEmail,
        category: parsed.data.category,
        source: 'ADMIN',
      },
    })
    await recordTicketActivity(tx, {
      eventId,
      action: 'ISSUED',
      ticketId: created.id,
      actor: actorFromSession(gate.session),
    })
    return created
  })

  const verifyUrl = buildVerifyUrl(ticket.token)
  const qrCodeDataUrl = await generateQRCodeDataURL(verifyUrl)

  if (isEmailEnabled()) {
    await sendTicketEmail({
      to: parsed.data.attendeeEmail,
      attendeeName: parsed.data.attendeeName,
      eventName: event.name,
      eventDate: event.bookingDeadline,
      eventVenue: event.venue,
      qrCodeDataUrl,
      verifyUrl,
    })
  }

  return NextResponse.json({ ...ticket, qrCodeDataUrl }, { status: 201 })
}
