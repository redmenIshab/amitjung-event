'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Plus, Minus, X } from 'lucide-react'

type AttendeeRow = {
  name: string
  email: string
  category: 'GENERAL' | 'VIP'
}

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()
  const eventId = params['booking-id'] as string

  const [event, setEvent] = useState<{
    name: string
    baseTicketPrice: number
    hasDiscount: boolean
    discountPercentage: number
    discountUpto: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [attendees, setAttendees] = useState<AttendeeRow[]>([
    { name: '', email: '', category: 'GENERAL' },
  ])

  useEffect(() => {
    if (!session) return
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
  }, [eventId, session])

  useEffect(() => {
    if (quantity > attendees.length) {
      const add = quantity - attendees.length
      setAttendees((prev) => [
        ...prev,
        ...Array.from({ length: add }, () => ({
          name: '',
          email: '',
          category: 'GENERAL' as const,
        })),
      ])
    } else if (quantity < attendees.length) {
      setAttendees((prev) => prev.slice(0, quantity))
    }
  }, [quantity])

  const updateAttendee = useCallback(
    (index: number, field: keyof AttendeeRow, value: string) => {
      setAttendees((prev) => {
        const next = [...prev]
        next[index] = { ...next[index], [field]: value }
        return next
      })
    },
    [],
  )

  const now = new Date()
  const discountActive =
    event?.hasDiscount &&
    event?.discountUpto !== null &&
    new Date(event.discountUpto) > now

  const basePrice = event?.baseTicketPrice ?? 0
  const subtotal = basePrice * attendees.length
  const discountAmount = discountActive
    ? Math.round(subtotal * (event!.discountPercentage / 100))
    : 0
  const total = subtotal - discountAmount

  async function handlePay() {
    if (!event || !session) return

    const emptyField = attendees.find((a) => !a.name || !a.email)
    if (emptyField) {
      setError('Please fill in name and email for all tickets')
      return
    }

    setPaying(true)
    setError('')

    try {
      const res = await fetch('/api/khalti/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, attendees }),
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

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="animate-spin text-white/40" size={32} />
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-white/60 mb-4">Please sign in to continue with your booking.</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="bg-white/10 text-white px-6 py-3 hover:bg-white/20 transition-colors cursor-pointer"
          >
            Sign In
          </button>
        </div>
      </main>
    )
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
    <main className="min-h-screen bg-[#0A0A0A] flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl md:text-3xl text-white font-bold uppercase tracking-tight mb-1">
          {event!.name}
        </h1>
        <p className="text-white/40 text-sm mb-8 uppercase tracking-wider">Complete your booking</p>

        {/* Quantity */}
        <div className="flex items-center gap-4 mb-8">
          <span className="text-white/80 text-sm uppercase tracking-wider">Tickets</span>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="text-white/60 hover:text-white disabled:opacity-30 cursor-pointer"
            >
              <Minus size={18} />
            </button>
            <span className="text-white text-lg font-bold w-8 text-center">{attendees.length}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="text-white/60 hover:text-white cursor-pointer"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {/* Attendee rows */}
        <div className="space-y-4 mb-8">
          {attendees.map((a, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/10 p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/40 text-xs uppercase tracking-wider">
                  Ticket #{i + 1}
                </span>
                {attendees.length > 1 && (
                  <button
                    onClick={() => {
                      setAttendees((prev) => prev.filter((_, idx) => idx !== i))
                      setQuantity((q) => q - 1)
                    }}
                    className="text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={a.name}
                  onChange={(e) => updateAttendee(i, 'name', e.target.value)}
                  className="bg-white/5 border border-white/10 px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
                  required
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={a.email}
                  onChange={(e) => updateAttendee(i, 'email', e.target.value)}
                  className="bg-white/5 border border-white/10 px-3 py-2 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/30"
                  required
                />
                <select
                  value={a.category}
                  onChange={(e) => updateAttendee(i, 'category', e.target.value)}
                  className="bg-white/5 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-white/30"
                >
                  <option value="GENERAL">GENERAL</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
            </div>
          ))}
        </div>

        {/* Price breakdown */}
        <div className="bg-white/5 border border-white/10 p-4 mb-8">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-white/80">
              <span>Ticket Price (×{attendees.length})</span>
              <span>Rs. {subtotal.toLocaleString()}</span>
            </div>
            {discountActive && (
              <div className="flex justify-between text-[#ffb0cc]">
                <span>Early-Bird Discount ({event!.discountPercentage}%)</span>
                <span>-Rs. {discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2 flex justify-between text-white font-bold text-lg">
              <span>Total</span>
              <span>Rs. {total.toLocaleString()}</span>
            </div>
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
