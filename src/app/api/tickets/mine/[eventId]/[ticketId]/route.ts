import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildVerifyUrl, generateQRCodeDataURL } from '@/lib/qr'
import { ticketDetailIdSchema } from '@/lib/validations'

type Params = { params: Promise<{ eventId: string; ticketId: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, ticketId } = await params
    const parsed = ticketDetailIdSchema.safeParse({ eventId, ticketId })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const participantId = session.user.id
    const userEmail = session.user.email ?? ''

    const ticket = await prisma.ticket.findFirst({
      where: {
        id: parsed.data.ticketId,
        eventId: parsed.data.eventId,
        OR: [
          { booking: { participantId } },
          ...(userEmail ? [{ attendeeEmail: userEmail }] : []),
        ],
      },
      include: {
        event: {
          select: {
            id: true, name: true, venue: true, bookingDeadline: true,
            image: true, description: true,
          },
        },
        checkIn: { select: { scannedAt: true } },
      },
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const verifyUrl = buildVerifyUrl(ticket.token)
    const qrDataUrl = await generateQRCodeDataURL(verifyUrl)

    return NextResponse.json({
      id: ticket.id,
      token: ticket.token,
      attendeeName: ticket.attendeeName,
      attendeeEmail: ticket.attendeeEmail,
      distributorName: ticket.distributorName,
      category: ticket.category,
      status: ticket.status,
      source: ticket.source,
      qrDataUrl,
      event: {
        ...ticket.event,
        bookingDeadline: ticket.event.bookingDeadline.toISOString(),
      },
      checkIn: ticket.checkIn
        ? { scannedAt: ticket.checkIn.scannedAt.toISOString() }
        : null,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
