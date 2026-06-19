import { NextResponse, NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redisConfig } from '@/lib/upstash/upstash'

export async function POST(request: NextRequest) {
  try {
    const key = request.headers.get('x-stress-key')
    if (key !== process.env.STRESS_TEST_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await request.json()
    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 })
    }

    const tickets = await prisma.ticket.findMany({
      where: { eventId, attendeeEmail: { endsWith: '@example.com' } },
      select: { id: true, bookingId: true },
    })

    if (tickets.length === 0) {
      return NextResponse.json({ removed: 0, message: 'No test tickets found' })
    }

    const ticketIds = tickets.map((t) => t.id)
    const bookingIds = [...new Set(tickets.map((t) => t.bookingId))]

    const payments = await prisma.booking.findMany({
      where: { id: { in: bookingIds } },
      select: { paymentId: true },
    })
    const paymentIds = payments.map((b) => b.paymentId)

    await prisma.checkIn.deleteMany({ where: { ticketId: { in: ticketIds } } })
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } })
    await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } })
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } })

    await redisConfig.del(`booking:queue:${eventId}`, `booking:lock:${eventId}`)

    return NextResponse.json({
      removed: tickets.length,
      bookings: bookingIds.length,
      payments: paymentIds.length,
    })
  } catch (err) {
    console.error('[Stress] Cleanup failed:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
