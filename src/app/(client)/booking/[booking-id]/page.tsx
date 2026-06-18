'use client'

import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function BookingResultPage() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const transaction_id = searchParams.get('transaction_id')
  const pidx = searchParams.get('pidx')
  const amount = searchParams.get('amount')
  const eventId = searchParams.get('eventId')
  const message = searchParams.get('message')

  const isSuccess = status === 'Completed'
  const isPending = status === 'Pending'
  const isError = status === 'error' || status === 'User canceled' || status === 'Expired'

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 text-center">
        {isSuccess ? (
          <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
        ) : isPending ? (
          <Loader2 size={48} className="mx-auto text-yellow-400 mb-4 animate-spin" />
        ) : (
          <XCircle size={48} className="mx-auto text-red-400 mb-4" />
        )}

        <h1 className="text-2xl text-white font-bold uppercase tracking-tight mb-2">
          {isSuccess ? 'Payment Successful' : isPending ? 'Payment Pending' : 'Payment Failed'}
        </h1>

        {message && <p className="text-white/60 text-sm mb-6">{message}</p>}

        <div className="bg-white/5 p-4 space-y-2 text-left mb-6">
          {pidx && (
            <div className="flex justify-between text-sm">
              <span className="text-white/40">PID</span>
              <span className="text-white/80 font-mono text-xs truncate ml-2">{pidx}</span>
            </div>
          )}
          {transaction_id && (
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Transaction ID</span>
              <span className="text-white/80 font-mono text-xs truncate ml-2">{transaction_id}</span>
            </div>
          )}
          {amount && (
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Amount</span>
              <span className="text-white/80 font-bold">Rs. {parseInt(amount).toLocaleString()}</span>
            </div>
          )}
          {eventId && (
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Event</span>
              <span className="text-white/80">{eventId}</span>
            </div>
          )}
        </div>

        <Link
          href={eventId ? `/events/${eventId}` : '/events'}
          className="inline-block w-full bg-[#ffb0cc] text-[#640038] font-bold py-3 hover:opacity-90 transition-all text-center"
        >
          {isSuccess ? 'Back to Event' : 'Try Again'}
        </Link>
      </div>
    </main>
  )
}
