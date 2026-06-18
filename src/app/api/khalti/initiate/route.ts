import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { eventId, amount } = await request.json();

    if (!eventId || !amount) {
      return NextResponse.json(
        { error: 'eventId and amount are required' },
        { status: 400 },
      );
    }

    if (amount < 1000) {
      return NextResponse.json(
        { error: 'Amount must be at least Rs. 10 (1000 paisa)' },
        { status: 400 },
      );
    }

    const secretKey = process.env.KHALTI_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: 'Khalti not configured' },
        { status: 500 },
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL as string;

    const khaltiRes = await fetch(
      "https://dev.khalti.com/api/v2/epayment/initiate/",
      {
        method: 'POST',
        headers: {
          Authorization: `Key ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          return_url: `${baseUrl}/api/khalti/callback?eventId=${eventId}`,
          website_url: process.env.NEXT_PUBLIC_APP_URL,
          amount,
          purchase_order_id: `${eventId}-${Date.now()}`,
          purchase_order_name: `Ticket for event ${eventId}`,
        }),
      },
    );

    const data = await khaltiRes.json();

    if (!khaltiRes.ok) {
      return NextResponse.json(
        { error: data.detail ?? 'Khalti initiation failed' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      payment_url: data.payment_url,
      pidx: data.pidx,
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
