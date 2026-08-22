import { NextResponse } from 'next/server'
import { clientIp, rateLimit, tooManyRequests } from '@/lib/rateLimit'
import { requireSession } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { storePendingBooking } from '@/lib/ticketing'
import { computeEventAvailability, purchaseBlockedReason } from '@/lib/events'
import { KHALTI_BASE_URL } from '@/lib/khalti'
import { isRedisConfigured } from '@/lib/upstash/upstash'

export async function POST(request: Request) {
  // Payment initiation talks to Khalti and writes a pending booking to Redis.
  // Limited per IP so a script cannot flood either.
  const limit = await rateLimit({
    key: `khalti:initiate:${clientIp(request)}`,
    limit: 10,
    windowSeconds: 60,
  })
  if (!limit.ok) return tooManyRequests(limit)

  try {
    // requireSession accepts the website's cookie *and* the mobile app's bearer
    // token; the PARTICIPANT check below is what actually restricts purchasing,
    // exactly as before.
    const gate = await requireSession(request)
    if (gate instanceof NextResponse) {
      return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })
    }
    const { session } = gate
    if (session.user.role !== 'PARTICIPANT') {
      return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })
    }

    // The payment flow persists the pending booking (pidx → booking) in Redis
    // between initiate and the Khalti callback. Fail clearly if it's missing.
    if (!isRedisConfigured) {
      return NextResponse.json(
        { error: 'Payment service is not configured (Upstash Redis missing)' },
        { status: 503 },
      )
    }

    // `client` lets the callback know where to return the buyer. Anything
    // other than the literal 'mobile' is treated as web.
    const { eventId, attendees, client } = await request.json()

    if (!eventId || !attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return NextResponse.json({ error: 'eventId and attendees are required' }, { status: 400 })
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    // Server-side availability using P1 inventory rules (non-cancelled sold
    // vs ticketsAvailable) — the client cannot bypass status/inventory checks.
    const soldCount = await prisma.ticket.count({
      where: { eventId, status: { not: 'CANCELLED' } },
    })
    const availability = computeEventAvailability({
      status: event.status,
      isOpen: event.isOpen,
      ticketsAvailable: event.ticketsAvailable,
      bookingDeadline: event.bookingDeadline,
      hasDiscount: event.hasDiscount,
      discountUpto: event.discountUpto,
      soldCount,
    })
    if (!availability.isPurchasable) {
      return NextResponse.json(
        { error: purchaseBlockedReason(availability) ?? 'Tickets are not available' },
        { status: 409 },
      )
    }
    if (attendees.length > availability.remaining) {
      return NextResponse.json(
        { error: `Only ${availability.remaining} ticket(s) available` },
        { status: 409 },
      )
    }

    const basePrice = event.baseTicketPrice
    const totalAmount = basePrice * attendees.length

    const now = new Date()
    const discountActive =
      event.hasDiscount && event.discountUpto > now

    const discountPercentage = discountActive ? event.discountPercentage : 0
    const discountAmount = Math.round(totalAmount * discountPercentage / 100)
    const finalAmount = totalAmount - discountAmount

    if (finalAmount < 10) {
      return NextResponse.json(
        { error: 'Total must be at least Rs. 10' },
        { status: 400 },
      )
    }

    const secretKey = process.env.KHALTI_SECRET_KEY
    if (!secretKey) {
      return NextResponse.json({ error: 'Khalti not configured' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL as string

    const khaltiRes = await fetch(`${KHALTI_BASE_URL}/api/v2/epayment/initiate/`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        return_url: `${baseUrl}/api/khalti/callback`,
        website_url: baseUrl,
        amount: finalAmount * 100,
        purchase_order_id: `${eventId}-${Date.now()}`,
        purchase_order_name: `Tickets for ${event.name}`,
      }),
    })

    const data = await khaltiRes.json()

    if (!khaltiRes.ok) {
      return NextResponse.json(
        { error: data.detail ?? 'Khalti initiation failed' },
        { status: 400 },
      )
    }

    await storePendingBooking(data.pidx, {
      eventId,
      participantId: session.user.id,
      attendees,
      amounts: {
        totalAmount,
        discountAmount,
        discountPercentage,
        finalAmount,
      },
      client: client === 'mobile' ? 'mobile' : 'web',
    })

    return NextResponse.json({
      payment_url: data.payment_url,
      pidx: data.pidx,
    })
  } catch (e) {
    console.error('POST /api/khalti/initiate:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
