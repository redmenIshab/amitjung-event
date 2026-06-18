import { NextResponse, NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pidx = searchParams.get('pidx')
    const status = searchParams.get('status')
    const transaction_id = searchParams.get('transaction_id')
    const amount = searchParams.get('amount')
    const eventId = searchParams.get('eventId')

    const secretKey = process.env.KHALTI_SECRET_KEY
    if (!secretKey) {
      return NextResponse.redirect(
        new URL(`/booking/result?status=error&message=Khalti+not+configured`, request.url),
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

    const params = new URLSearchParams({
      pidx: pidx ?? '',
      status: lookupStatus ?? '',
      transaction_id: transaction_id ?? '',
      amount: amount ?? '',
      eventId: eventId ?? '',
    })

    return NextResponse.redirect(new URL(`/booking/result?${params.toString()}`, request.url))
  } catch {
    return NextResponse.redirect(
      new URL(`/booking/result?status=error&message=Verification+failed`, request.url),
    )
  }
}
