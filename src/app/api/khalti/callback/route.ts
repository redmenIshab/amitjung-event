import { NextResponse, NextRequest } from 'next/server'
import { getPendingBooking, enqueueBooking, processBookingQueue } from '@/lib/ticketing'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pidx = searchParams.get('pidx')
    const status = searchParams.get('status')

    const secretKey = process.env.KHALTI_SECRET_KEY
    if (!secretKey) {
      return NextResponse.redirect(
        new URL('/booking/result?jobId=error&error=Khalti+not+configured', request.url),
      )
    }

    let lookupStatus = status

    if (pidx) {
      const lookupRes = await fetch('https://dev.khalti.com/api/v2/epayment/lookup/', {
        method: 'POST',
        headers: {
          Authorization: `Key ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pidx }),
      })

      const lookupData = await lookupRes.json()
      lookupStatus = lookupData.status ?? status
    }

    if (lookupStatus !== 'Completed') {
      return NextResponse.redirect(
        new URL(`/booking/result?jobId=error&error=Payment+was+not+completed`, request.url),
      )
    }

    if (!pidx) {
      return NextResponse.redirect(
        new URL('/booking/result?jobId=error&error=Missing+payment+ID', request.url),
      )
    }

    const pending = await getPendingBooking(pidx)
    if (!pending) {
      return NextResponse.redirect(
        new URL('/booking/result?jobId=error&error=Booking+data+expired', request.url),
      )
    }

    const jobId = await enqueueBooking(pending.eventId, {
      participantId: pending.participantId,
      attendees: pending.attendees,
      amounts: pending.amounts,
      pidx,
    })

    await processBookingQueue(pending.eventId)

    return NextResponse.redirect(
      new URL(`/booking/result?jobId=${jobId}`, request.url),
    )
  } catch {
    return NextResponse.redirect(
      new URL('/booking/result?jobId=error&error=Something+went+wrong', request.url),
    )
  }
}
