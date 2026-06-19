import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  storePendingBooking,
  getPendingBooking,
  enqueueBooking,
  processBookingQueue,
  getBookingResult,
} from '@/lib/ticketing'

export async function POST(request: NextRequest) {
  try {
    const key = request.headers.get('x-stress-key')
    if (key !== process.env.STRESS_TEST_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, participantId, attendees, amounts } = await request.json()

    if (!eventId || !participantId || !attendees?.length || !amounts) {
      return NextResponse.json({ error: 'Missing required fields: eventId, participantId, attendees, amounts' }, { status: 400 })
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const existingBookings = await prisma.ticket.count({ where: { eventId } })
    const available = event.capacity - existingBookings
    if (attendees.length > available) {
      return NextResponse.json(
        { error: `Sold out — only ${available} ticket(s) available` },
        { status: 409 },
      )
    }

    const pidx = `mock-${crypto.randomUUID()}`

    await storePendingBooking(pidx, {
      eventId,
      participantId,
      attendees,
      amounts,
    })

    const pending = await getPendingBooking(pidx)
    if (!pending) {
      return NextResponse.json({ error: 'Failed to create pending booking' }, { status: 500 })
    }

    const jobId = await enqueueBooking(pending.eventId, {
      participantId: pending.participantId,
      attendees: pending.attendees,
      amounts: pending.amounts,
      pidx,
    })

    await processBookingQueue(pending.eventId)

    const result = await getBookingResult(jobId)

    return NextResponse.json({ jobId, result })
  } catch (err) {
    console.error('[Stress] /api/stress/book failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
