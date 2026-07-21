import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const gate = await requireSession()
    if (gate instanceof NextResponse) return gate
    const { session } = gate

    const participantId = session.user.id
    const userEmail = session.user.email ?? ''

    const tickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { booking: { participantId } },
          ...(userEmail ? [{ attendeeEmail: userEmail }] : []),
        ],
      },
      include: {
        event: {
          select: { id: true, name: true, venue: true, bookingDeadline: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const groups = new Map<string, {
      event: { id: string; name: string; venue: string; bookingDeadline: Date; image: string | null }
      count: number
    }>()

    for (const t of tickets) {
      if (!groups.has(t.eventId)) {
        groups.set(t.eventId, { event: t.event, count: 0 })
      }
      groups.get(t.eventId)!.count++
    }

    const eventGroups = [...groups.values()]

    return NextResponse.json({
      groups: eventGroups.map((g) => ({
        event: {
          ...g.event,
          bookingDeadline: g.event.bookingDeadline.toISOString(),
        },
        count: g.count,
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
