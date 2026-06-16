import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { registerSchema } from '@/lib/validations'
import { generateQRCodeDataURL, buildVerifyUrl } from '@/lib/qr'
import { sendTicketEmail, isEmailEnabled } from '@/lib/email'

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

  const ticket = await prisma.ticket.create({
    data: {
      eventId,
      attendeeName: parsed.data.attendeeName,
      attendeeEmail: parsed.data.attendeeEmail,
      source: 'SELF_REGISTERED',
    },
  })

  const verifyUrl = buildVerifyUrl(ticket.token)
  const qrCodeDataUrl = await generateQRCodeDataURL(verifyUrl)

  if (isEmailEnabled()) {
    await sendTicketEmail({
      to: parsed.data.attendeeEmail,
      attendeeName: parsed.data.attendeeName,
      eventName: event.name,
      eventDate: event.date,
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
