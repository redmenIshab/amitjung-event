import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { storePendingBooking } from '@/lib/ticketing'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'PARTICIPANT') {
      return NextResponse.json({ error: 'Please sign in to continue' }, { status: 401 })
    }

    const { eventId, attendees } = await request.json()

    if (!eventId || !attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return NextResponse.json({ error: 'eventId and attendees are required' }, { status: 400 })
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const existingBookings = await prisma.ticket.count({ where: { eventId } })
    const available = event.capacity - existingBookings
    if (attendees.length > available) {
      return NextResponse.json(
        { error: `Only ${available} ticket(s) available` },
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

    const khaltiRes = await fetch('https://dev.khalti.com/api/v2/epayment/initiate/', {
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
    })

    return NextResponse.json({
      payment_url: data.payment_url,
      pidx: data.pidx,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
