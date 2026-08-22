import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { generateQRCodeDataURL, buildVerifyUrl } from '@/lib/qr'
import { sendTicketEmail, isEmailEnabled } from '@/lib/email'
import { ensureSystemBooking } from '@/lib/ticketing'
import { SYSTEM_ACTOR, recordTicketActivity } from '@/lib/ticketActivity'

type Params = { params: Promise<{ eventId: string }> }

export async function POST(request: Request, { params }: Params) {
  const { eventId } = await params

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  if (!event.isOpen) {
    return NextResponse.json({ error: 'Registration is closed for this event' }, { status: 409 })
  }

  const body = await request.json()
  const parsed = registerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const existing = await prisma.ticket.findFirst({
    where: { eventId, attendeeEmail: parsed.data.attendeeEmail },
  })
  if (existing) {
    return NextResponse.json(
      { error: 'A ticket for this email already exists for this event' },
      { status: 409 }
    )
  }

  const bookingId = await ensureSystemBooking(eventId)

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.ticket.create({
      data: {
        eventId,
        bookingId,
        attendeeName: parsed.data.attendeeName,
        attendeeEmail: parsed.data.attendeeEmail,
        source: 'SELF_REGISTERED',
      },
    })
    // Public endpoint: there is no session, so the attendee's own details are
    // the only identity available. Recorded as SYSTEM with the email in meta
    // rather than pretending an authenticated actor exists.
    await recordTicketActivity(tx, {
      eventId,
      action: 'SELF_REGISTERED',
      ticketId: created.id,
      actor: SYSTEM_ACTOR,
      meta: { attendeeEmail: parsed.data.attendeeEmail },
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

  return NextResponse.json(
    { message: isEmailEnabled() ? 'Ticket sent to your email' : 'Registration successful' },
    { status: 201 },
  )
}
