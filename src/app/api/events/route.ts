import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { createEventSchema } from '@/lib/validations'
import { getCachedEvents, invalidateEventCache } from '@/lib/upstash/services/event-cache'

export async function GET() {
  try {
    const events = await getCachedEvents()

    return NextResponse.json(events)
  } catch (e) {
    console.error('GET /api/events:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      hasDiscount: parsed.data.hasDiscount,
      discountPercentage: parsed.data.discountPercentage,
      discountUpto: parsed.data.discountUpto
        ? new Date(parsed.data.discountUpto)
        : new Date(parsed.data.date),
      isOpen: parsed.data.isOpen,
      genres: parsed.data.genres,
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
