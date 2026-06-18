'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

type EventData = {
  name: string
  baseTicketPrice: number
  hasDiscount: boolean
  discountPercentage: number
  discountUpto: string | null
}

export default function CheckoutPage() {
  const params = useParams()
  const eventId = params.id as string
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    fetch(`${baseUrl}/api/events/${eventId}`)
      .then((r) => r.json())
      .then((data) => {
        setEvent(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load event')
        setLoading(false)
      })
  }, [eventId])

  async function handlePay() {
    if (!event) return
    setPaying(true)
    setError('')

    const now = new Date()
    const discountActive = event.hasDiscount && event.discountUpto !== null && new Date(event.discountUpto) > now
    const amount = discountActive
      ? Math.round(event.baseTicketPrice * (1 - event.discountPercentage / 100))
      : event.baseTicketPrice

    try {
      const res = await fetch('/api/khalti/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, amount }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Payment initiation failed')
      }

      const { payment_url } = await res.json()
      window.location.href = payment_url
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </main>
    )
  }

  if (error && !event) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl text-white font-bold uppercase tracking-tight mb-2">
          {event!.name}
        </h1>
        <p className="text-white/40 text-sm mb-6 uppercase tracking-wider">Complete your booking</p>

        <div className="space-y-3 mb-8">
          <div className="flex justify-between text-white/80">
            <span>Ticket Price</span>
            <span>Rs. {event!.baseTicketPrice.toLocaleString()}</span>
          </div>
          {(() => {
            const now = new Date()
            const discountActive = event!.hasDiscount && event!.discountUpto !== null && new Date(event!.discountUpto) > now
            if (discountActive) {
              return (
                <div className="flex justify-between text-[#ffb0cc]">
                  <span>Early-Bird Discount ({event!.discountPercentage}%)</span>
                  <span>-Rs. {Math.round(event!.baseTicketPrice * event!.discountPercentage / 100).toLocaleString()}</span>
                </div>
              )
            }
            return null
          })()}
          <div className="border-t border-white/10 pt-3 flex justify-between text-white font-bold text-lg">
            <span>Total</span>
            <span>Rs. {(() => {
              const now = new Date()
              const discountActive = event!.hasDiscount && event!.discountUpto !== null && new Date(event!.discountUpto) > now
              return discountActive
                ? Math.round(event!.baseTicketPrice * (1 - event!.discountPercentage / 100)).toLocaleString()
                : event!.baseTicketPrice.toLocaleString()
            })()}</span>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

        <button
          onClick={handlePay}
          disabled={paying}
          className="w-full bg-[#ffb0cc] text-[#640038] font-bold py-3 hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
        >
          {paying ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Processing…
            </>
          ) : (
            'Pay with Khalti'
          )}
        </button>
      </div>
    </main>
  )
}
