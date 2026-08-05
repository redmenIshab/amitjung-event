import { NextResponse, NextRequest } from 'next/server'
import {
  getPendingBooking,
  enqueueBooking,
  processBookingQueue,
  peekPendingBookingClient,
} from '@/lib/ticketing'
import { KHALTI_BASE_URL } from '@/lib/khalti'

export async function GET(request: NextRequest) {
  // Hoisted so the catch below can also return a mobile buyer to the app.
  let client: 'web' | 'mobile' = 'web'
  try {
    const { searchParams } = new URL(request.url)
    const pidx = searchParams.get('pidx')
    const status = searchParams.get('status')

    // Resolve the originating client up front, so the failure paths below hand
    // a mobile buyer back to the app rather than stranding them on a web page
    // inside a browser sheet. Peeked without consuming the pending record.
    client = pidx ? await peekPendingBookingClient(pidx) : 'web'

    /**
     * Finishes the flow for whichever client started it. The app listens for
     * the `lyante://booking` deep link to close its browser sheet and refresh
     * the wallet; the website keeps its existing /booking/result page.
     */
    const finish = (params: string) =>
      client === 'mobile'
        ? NextResponse.redirect(`lyante://booking?${params}`)
        : NextResponse.redirect(new URL(`/booking/result?${params}`, request.url))

    const secretKey = process.env.KHALTI_SECRET_KEY
    if (!secretKey) {
      return finish('jobId=error&error=Khalti+not+configured')
    }

    let lookupStatus = status

    if (pidx) {
      const lookupRes = await fetch(`${KHALTI_BASE_URL}/api/v2/epayment/lookup/`, {
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
      return finish('jobId=error&error=Payment+was+not+completed')
    }

    if (!pidx) {
      return finish('jobId=error&error=Missing+payment+ID')
    }

    const pending = await getPendingBooking(pidx)
    if (!pending) {
      return finish('jobId=error&error=Booking+data+expired')
    }

    const jobId = await enqueueBooking(pending.eventId, {
      participantId: pending.participantId,
      attendees: pending.attendees,
      amounts: pending.amounts,
      pidx,
    })

    await processBookingQueue(pending.eventId)

    return finish(`jobId=${jobId}`)
  } catch (e) {
    console.error('GET /api/khalti/callback:', e)
    const params = 'jobId=error&error=Something+went+wrong'
    return client === 'mobile'
      ? NextResponse.redirect(`lyante://booking?${params}`)
      : NextResponse.redirect(new URL(`/booking/result?${params}`, request.url))
  }
}
