import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildVerifyUrl, generateQRCodeDataURL } from '@/lib/qr'
import { ticketEventIdSchema } from '@/lib/validations'

type Params = { params: Promise<{ eventId: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await params
    const parsed = ticketEventIdSchema.safeParse({ eventId })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const participantId = session.user.id
    const userEmail = session.user.email ?? ''

    const tickets = await prisma.ticket.findMany({
      where: {
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
      },
      orderBy: { createdAt: 'desc' },
    })

    if (tickets.length === 0) {
      return NextResponse.json({ error: 'No tickets found for this event' }, { status: 404 })
    }

    const event = tickets[0].event

    const ticketsWithQR = await Promise.all(
      tickets.map(async (t) => {
        const verifyUrl = buildVerifyUrl(t.token)
        const qrDataUrl = await generateQRCodeDataURL(verifyUrl)
        return {
          id: t.id,
          token: t.token,
          attendeeName: t.attendeeName,
          attendeeEmail: t.attendeeEmail,
          category: t.category,
          status: t.status,
          source: t.source,
          qrDataUrl,
        }
      }),
    )

    return NextResponse.json({
      event: {
        ...event,
        bookingDeadline: event.bookingDeadline.toISOString(),
      },
      tickets: ticketsWithQR,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
