import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { generateTicketSchema } from '@/lib/validations'
import { generateQRCodeDataURL, buildVerifyUrl } from '@/lib/qr'
import { sendTicketEmail, isEmailEnabled } from '@/lib/email'
import { ensureSystemBooking } from '@/lib/ticketing'

type Params = { params: Promise<{ eventId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const gate = await requireApiCapability('DASHBOARD_VIEW')
  if (gate instanceof NextResponse) return gate

  const { eventId } = await params
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

  const ticket = await prisma.ticket.create({
    data: {
      eventId,
      bookingId,
      attendeeName: parsed.data.attendeeName,
      attendeeEmail: parsed.data.attendeeEmail,
      category: parsed.data.category,
      source: 'ADMIN',
    },
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
