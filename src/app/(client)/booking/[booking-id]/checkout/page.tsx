'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Loader2, Plus, Minus, X, Lock, ShieldCheck, BadgeCheck } from 'lucide-react'

type AttendeeRow = {
  name: string
  email: string
  category: 'GENERAL' | 'VIP'
}

/** Khalti wordmark badge — signals the verified payment partner. */
function KhaltiMark({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] bg-[#5C2D91] px-1.5 py-0.5 text-[11px] font-bold lowercase tracking-tight text-white ${className}`}
    >
      khalti
    </span>
  )
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
  // When on, every ticket is registered to the signed-in user (default).
  const [useSameDetails, setUseSameDetails] = useState(true)

  // Pre-fill the first ticket with the signed-in user's details.
  useEffect(() => {
    if (!session?.user) return
    setAttendees((prev) => {
      if (prev.length && !prev[0].name && !prev[0].email) {
        const next = [...prev]
        next[0] = {
          ...next[0],
          name: session.user.name ?? '',
          email: session.user.email ?? '',
        }
        return next
      }
      return prev
    })
  }, [session])

  // Not signed in → go straight to the auth flow, returning here afterwards.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(
        `/auth/login?callbackUrl=${encodeURIComponent(`/booking/${eventId}/checkout`)}`,
      )
    }
  }, [status, eventId, router])

  useEffect(() => {
    if (!session) return
    fetch(`/api/events/${eventId}`)
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

    // When "use my details" is on, register every ticket to the signed-in user.
    const effectiveAttendees = useSameDetails
      ? attendees.map((a) => ({
          name: session.user.name ?? '',
          email: session.user.email ?? '',
          category: a.category,
        }))
      : attendees

    const emptyField = effectiveAttendees.find((a) => !a.name || !a.email)
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
        body: JSON.stringify({ eventId, attendees: effectiveAttendees }),
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

  if (status === 'loading' || (loading && !error)) {
    return (
      <main className="min-h-screen bg-lyante-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={32} />
      </main>
    )
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-lyante-bg flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-gold" size={32} />
        <p className="text-ash text-sm">Redirecting to sign in…</p>
      </main>
    )
  }

  if (error && !event) {
    return (
      <main className="min-h-screen bg-lyante-bg flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </main>
    )
  }

  const inputClass =
    'w-full bg-lyante-bg border border-coal/40 rounded-md px-3 py-2.5 text-ivory text-sm placeholder:text-ash focus:outline-none focus:border-gold transition-colors'

  return (
    <main className="min-h-screen bg-lyante-bg text-ivory">
      {/* Ambient gold wash */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(200,146,42,0.10),_transparent_55%)]" />

      <div className="relative max-w-5xl mx-auto px-4 md:px-8 pt-14 md:pt-20 pb-24">
        {/* Header */}
        <div className="mb-8 md:mb-10">
          <div className="flex items-center gap-2 text-gold mb-2">
            <Lock size={13} />
            <span className="section-label tracking-widest">Secure Checkout</span>
          </div>
          <h1 className="font-bebas text-ivory text-[44px] md:text-[64px] leading-[0.85] tracking-tight uppercase">
            {event!.name}
          </h1>
          <div className="mt-4 h-px w-full bg-gradient-to-r from-gold/60 via-coal/40 to-transparent" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 items-start">
          {/* ══ Left: booking details ══ */}
          <div>
            {/* Quantity */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="font-bebas text-xl text-ivory tracking-wide uppercase leading-none">
                  Tickets
                </p>
                <p className="text-ash text-xs mt-1">How many are you booking?</p>
              </div>
              <div className="flex items-center gap-4 bg-lyante-surface border border-coal/40 rounded-md px-4 py-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="text-ash hover:text-gold disabled:opacity-30 disabled:hover:text-ash cursor-pointer transition-colors"
                  aria-label="Decrease"
                >
                  <Minus size={18} />
                </button>
                <span className="text-ivory text-lg font-bold w-8 text-center tabular-nums">
                  {attendees.length}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="text-ash hover:text-gold cursor-pointer transition-colors"
                  aria-label="Increase"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Registration details */}
            <p className="font-bebas text-xl text-ivory tracking-wide uppercase leading-none mb-3">
              Attendee Details
            </p>
            <label className="flex items-center gap-2.5 mb-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useSameDetails}
                onChange={(e) => setUseSameDetails(e.target.checked)}
                className="h-4 w-4 accent-gold"
              />
              <span className="text-ivory/85 text-sm">Use my details for all tickets</span>
            </label>
            {useSameDetails ? (
              <p className="text-ash text-xs mb-6">
                All {attendees.length} ticket{attendees.length > 1 ? 's' : ''} will be registered to{' '}
                <span className="text-ivory/80">{session.user.name}</span> · {session.user.email}
              </p>
            ) : (
              <p className="text-ash text-xs mb-6">Enter attendee details for each ticket.</p>
            )}

            {/* Attendee rows */}
            <div className="space-y-3">
              {attendees.map((a, i) => (
                <div
                  key={i}
                  className="bg-lyante-surface border border-coal/40 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gold text-[11px] uppercase tracking-widest font-medium">
                      Ticket #{i + 1}
                    </span>
                    {attendees.length > 1 && (
                      <button
                        onClick={() => {
                          setAttendees((prev) => prev.filter((_, idx) => idx !== i))
                          setQuantity((q) => q - 1)
                        }}
                        className="text-ash hover:text-red-400 cursor-pointer transition-colors"
                        aria-label="Remove ticket"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  {useSameDetails ? (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 md:items-center">
                      <p className="text-ash text-sm truncate">
                        {session.user.name} · {session.user.email}
                      </p>
                      <select
                        value={a.category}
                        onChange={(e) => updateAttendee(i, 'category', e.target.value)}
                        className="bg-lyante-bg border border-coal/40 rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-gold transition-colors"
                      >
                        <option value="GENERAL">GENERAL</option>
                        <option value="VIP">VIP</option>
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={a.name}
                        onChange={(e) => updateAttendee(i, 'name', e.target.value)}
                        className={inputClass}
                        required
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={a.email}
                        onChange={(e) => updateAttendee(i, 'email', e.target.value)}
                        className={inputClass}
                        required
                      />
                      <select
                        value={a.category}
                        onChange={(e) => updateAttendee(i, 'category', e.target.value)}
                        className="bg-lyante-bg border border-coal/40 rounded-md px-3 py-2 text-ivory text-sm focus:outline-none focus:border-gold transition-colors"
                      >
                        <option value="GENERAL">GENERAL</option>
                        <option value="VIP">VIP</option>
                      </select>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ══ Right: order summary + trust + pay ══ */}
          <div className="lg:sticky lg:top-8 space-y-4">
            {/* Order summary */}
            <div className="bg-lyante-surface border border-coal/40 rounded-lg p-5">
              <p className="font-bebas text-lg text-ivory tracking-wide uppercase mb-4">
                Order Summary
              </p>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-ivory/80">
                  <span>Ticket price (×{attendees.length})</span>
                  <span className="tabular-nums">Rs. {subtotal.toLocaleString()}</span>
                </div>
                {discountActive && (
                  <div className="flex justify-between text-gold-light">
                    <span>Early-bird ({event!.discountPercentage}%)</span>
                    <span className="tabular-nums">-Rs. {discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="border-t border-coal/40 pt-3 mt-1 flex justify-between items-baseline">
                  <span className="text-ivory font-bebas text-lg tracking-wide uppercase">Total</span>
                  <span className="text-gold font-bold text-2xl tabular-nums">
                    Rs. {total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center bg-red-500/10 border border-red-500/20 rounded-md py-2 px-3">
                {error}
              </p>
            )}

            {/* Pay button */}
            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full bg-gold text-lyante-bg font-bold py-3.5 rounded-md hover:bg-gold-light transition-colors disabled:opacity-50 disabled:hover:bg-gold cursor-pointer flex items-center justify-center gap-2.5 uppercase tracking-wide"
            >
              {paying ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Processing…
                </>
              ) : (
                <>
                  <Lock size={16} />
                  Securely Pay
                  <KhaltiMark />
                </>
              )}
            </button>

            {/* Trust panel */}
            <div className="bg-lyante-surface/60 border border-coal/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={16} className="text-gold shrink-0" />
                <p className="text-ivory/75 text-xs leading-snug">
                  256-bit SSL encrypted — your connection is private and secure.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <BadgeCheck size={16} className="text-gold shrink-0" />
                <p className="text-ivory/75 text-xs leading-snug">
                  Payments processed by <KhaltiMark />, Nepal's trusted gateway. We never see or
                  store your card or wallet details.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <Lock size={16} className="text-gold shrink-0" />
                <p className="text-ivory/75 text-xs leading-snug">
                  Tickets are issued instantly to your account after payment.
                </p>
              </div>
              <div className="border-t border-coal/30 pt-3 flex items-center justify-center gap-2 text-ash text-[10px] uppercase tracking-widest">
                <span>Khalti</span>
                <span className="text-coal">·</span>
                <span>Cards</span>
                <span className="text-coal">·</span>
                <span>Mobile Banking</span>
                <span className="text-coal">·</span>
                <span>Wallets</span>
              </div>
            </div>

            <p className="text-center text-ash text-[11px]">
              By continuing you agree to Lyante's terms &amp; refund policy.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
