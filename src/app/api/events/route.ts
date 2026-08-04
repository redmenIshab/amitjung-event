import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { createEventSchema } from '@/lib/validations'
import { getCachedEvents, invalidateEventCache } from '@/lib/upstash/services/event-cache'

export async function GET() {
  try {
    const events = await getCachedEvents()

    // Sold counts are read live (never from the day-long event cache) so
    // availability/badges stay accurate as tickets are purchased.
    const sold = await prisma.ticket.groupBy({
      by: ['eventId'],
      where: { status: { not: 'CANCELLED' } },
      _count: true,
    })
    const soldByEvent = new Map(sold.map((s) => [s.eventId, s._count]))
    const withCounts = events.map((e) => ({ ...e, soldCount: soldByEvent.get(e.id) ?? 0 }))

    return NextResponse.json(withCounts)
  } catch (e) {
    console.error('GET /api/events:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireApiCapability('EVENT_WRITE')
    if (gate instanceof NextResponse) return gate

    const body = await request.json()
    const parsed = createEventSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const data: Prisma.EventUncheckedCreateInput = {
      name: parsed.data.name,
      venue: parsed.data.venue,
      bookingDeadline: new Date(parsed.data.date),
      capacity: parsed.data.capacity,
      baseTicketPrice: parsed.data.baseTicketPrice,
      commissionPercentage: parsed.data.commissionPercentage,
      hasDiscount: parsed.data.hasDiscount,
      discountPercentage: parsed.data.discountPercentage,
      discountUpto: parsed.data.discountUpto
        ? new Date(parsed.data.discountUpto)
        : new Date(parsed.data.date),
      isOpen: parsed.data.isOpen,
      genres: parsed.data.genres,
      ticketsAvailable: parsed.data.ticketsAvailable,
      status: parsed.data.status,
      eventType: parsed.data.eventType,
    }
    if (parsed.data.description) data.description = parsed.data.description
    if (parsed.data.image) data.image = parsed.data.image
    if (parsed.data.artistId) data.artistId = parsed.data.artistId

    const event = await prisma.event.create({ data })

    await invalidateEventCache()

    return NextResponse.json(event, { status: 201 })
  } catch (e) {
    console.error('POST /api/events:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
