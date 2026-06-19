import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateTicketSchema } from '@/lib/validations'
import { generateQRCodeDataURL, buildVerifyUrl } from '@/lib/qr'
import { sendTicketEmail, isEmailEnabled } from '@/lib/email'
import { ensureSystemBooking } from '@/lib/ticketing'

type Params = { params: Promise<{ eventId: string }> }

const ADMIN_ROLES = ['ADMIN', 'STAFF', 'MANAGER'] as const

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN_ROLES.includes(session.user.role as typeof ADMIN_ROLES[number])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { eventId } = await params
  const tickets = await prisma.ticket.findMany({
    where: { eventId },
    include: { checkIn: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(tickets)
}

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

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
