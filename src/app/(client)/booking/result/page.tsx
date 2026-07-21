'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { checkBookingStatus } from './actions'

type Result = {
  status: string
  bookingId?: string
  reference?: string
  error?: string
}

export default function BookingResultPage() {
  const router = useRouter()
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
        error: error ? decodeURIComponent(error) : 'Booking failed',
      })
      setLoading(false)
      return
    }

    poll(jobId)
  }, [poll])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="animate-spin text-white/40 mx-auto mb-4" size={32} />
          <p className="text-white/60">Processing your booking...</p>
        </div>
      </main>
    )
  }

  if (result?.status === 'error') {
    return (
      <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 text-center">
          <div className="text-red-400 text-5xl mb-4">✕</div>
          <h1 className="text-2xl text-white font-bold mb-2">Booking Failed</h1>
          <p className="text-white/60 mb-6">{result.error}</p>
          <Link
            href="/events"
            className="inline-block bg-white/10 text-white px-6 py-3 hover:bg-white/20 transition-colors"
          >
            Browse Events
          </Link>
        </div>
      </main>
    )
  }

  const refShort = result?.reference ?? ''

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 text-center">
        <div className="text-green-400 text-5xl mb-4">✓</div>
        <h1 className="text-2xl text-white font-bold mb-2">Booking Confirmed!</h1>
        <p className="text-white/60 mb-6">
          Your booking has been confirmed. Tickets have been sent to your email.
        </p>
        <div className="bg-white/10 rounded px-4 py-3 mb-6">
          <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Booking Reference</p>
          <p className="text-white font-mono text-lg">{refShort}...</p>
        </div>
        <Link
          href="/events"
          className="inline-block bg-[#ffb0cc] text-[#640038] font-bold px-6 py-3 hover:opacity-90 transition-colors"
        >
          Browse More Events
        </Link>
      </div>
    </main>
  )
}
