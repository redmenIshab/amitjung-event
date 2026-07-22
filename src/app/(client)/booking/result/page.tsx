'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, CheckCircle2, XCircle, Ticket, ArrowRight, Mail } from 'lucide-react'
import { checkBookingStatus } from './actions'

type Result = {
  status: string
  bookingId?: string
  reference?: string
  error?: string
}

export default function BookingResultPage() {
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)

  const poll = useCallback(async (jobId: string) => {
    while (true) {
      const data = await checkBookingStatus(jobId)
      if (data.status === 'done' || data.status === 'error') {
        setResult(data)
        setLoading(false)
        return
      }
      await new Promise((r) => setTimeout(r, 2000))
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const jobId = params.get('jobId')

    if (!jobId || jobId === 'error') {
      const error = params.get('error')
      setResult({
        status: 'error',
        error: error ? decodeURIComponent(error) : 'Your booking could not be completed.',
      })
      setLoading(false)
      return
    }

    poll(jobId)
  }, [poll])

  // ── Processing ──────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-lyante-bg flex items-center justify-center px-4">
        <div className="text-center">
          <div className="relative inline-flex mb-5">
            <div className="absolute inset-0 rounded-full bg-gold/15 blur-2xl" />
            <Loader2 className="relative animate-spin text-gold" size={40} />
          </div>
          <h1 className="text-xl font-semibold text-ivory mb-1">Confirming your payment</h1>
          <p className="text-ash text-sm">Hang tight — this only takes a moment.</p>
        </div>
      </main>
    )
  }

  // ── Failure ─────────────────────────────────────────────────
  if (result?.status === 'error') {
    return (
      <main className="min-h-screen bg-lyante-bg flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="relative inline-flex mb-6">
            <div className="absolute inset-0 rounded-full bg-red-500/15 blur-2xl" />
            <div className="relative w-20 h-20 rounded-full bg-red-500/10 border border-red-500/40 flex items-center justify-center">
              <XCircle className="text-red-400" size={40} />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-ivory mb-2">Payment Not Completed</h1>
          <p className="text-ash mb-6 leading-relaxed">{result.error}</p>
          <p className="text-coal text-xs mb-8">
            If money was deducted, it will be refunded automatically — you are not charged for a
            failed booking.
          </p>
          <Link
            href="/events"
            className="w-full flex items-center justify-center gap-2 bg-gold text-lyante-bg font-bold py-3.5 rounded-xl hover:bg-gold-light transition-colors"
          >
            Back to Events
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    )
  }

  // ── Success ─────────────────────────────────────────────────
  const reference = result?.reference ?? result?.bookingId ?? ''

  return (
    <main className="min-h-screen bg-lyante-bg flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="relative inline-flex mb-6">
          <div className="absolute inset-0 rounded-full bg-gold/25 blur-2xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center">
            <CheckCircle2 className="text-gold" size={42} />
          </div>
        </div>

        <p className="section-label tracking-widest mb-2">Payment Successful</p>
        <h1 className="text-3xl md:text-4xl font-bold text-ivory mb-3">You&apos;re going!</h1>
        <p className="text-ash mb-6 flex items-center justify-center gap-2">
          <Mail size={15} className="text-gold" />
          Your tickets have been emailed to you.
        </p>

        {reference && (
          <div className="bg-lyante-surface border border-coal/60 rounded-xl px-4 py-3 mb-8">
            <p className="text-[11px] uppercase tracking-widest text-gold mb-1">Booking Reference</p>
            <p className="text-ivory font-mono text-base break-all">{reference}</p>
          </div>
        )}

        <div className="space-y-3">
          <Link
            href="/tickets"
            className="w-full flex items-center justify-center gap-2 bg-gold text-lyante-bg font-bold py-3.5 rounded-xl hover:bg-gold-light transition-colors"
          >
            <Ticket size={18} />
            View My Tickets
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/events"
            className="w-full block border border-coal/60 text-ash py-3 rounded-xl hover:text-ivory hover:border-gold/50 transition-colors"
          >
            Browse More Events
          </Link>
        </div>
      </div>
    </main>
  )
}
