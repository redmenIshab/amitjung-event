'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Undo2 } from 'lucide-react'

type Mode = 'cancel' | 'refund'

/**
 * Cancel / refund controls for one ticket row.
 *
 * Refund lives here rather than on a payments screen because the Control
 * Center has no payments UI — this is where an admin already is when a buyer
 * asks for their money back. It refunds the whole payment behind the ticket,
 * which is why the confirmation says so explicitly.
 */
export function TicketActions({
  eventId,
  ticketId,
  status,
  canCancel,
  canRefund,
  /** False for comped tickets, whose synthetic payment is worth nothing. */
  refundable,
}: {
  eventId: string
  ticketId: string
  status: 'UNUSED' | 'USED' | 'CANCELLED'
  canCancel: boolean
  canRefund: boolean
  refundable: boolean
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const showCancel = canCancel && status !== 'CANCELLED'
  const showRefund = canRefund && refundable
  if (!showCancel && !showRefund) return null

  async function submit() {
    if (!reason.trim()) {
      setError('A reason is required.')
      return
    }
    setLoading(true)
    setError('')

    const url =
      mode === 'refund'
        ? `/api/events/${eventId}/tickets/${ticketId}/refund`
        : `/api/events/${eventId}/tickets/${ticketId}`

    const res = await fetch(url, {
      method: mode === 'refund' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: reason.trim() }),
    })

    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      if (mode === 'refund' && data.alreadyUsed > 0) {
        // Surfaced rather than swallowed: someone was admitted on a purchase
        // that has now been refunded, and the admin needs to know.
        setNotice(
          `Refunded. ${data.alreadyUsed} ticket${data.alreadyUsed === 1 ? ' had' : 's had'} already been checked in — the scan record stands.`,
        )
      } else {
        setMode(null)
      }
      setReason('')
      router.refresh()
    } else {
      let message = mode === 'refund' ? 'Failed to refund' : 'Failed to cancel'
      try {
        const data = await res.json()
        if (typeof data.error === 'string') message = data.error
      } catch {}
      setError(message)
    }
    setLoading(false)
  }

  if (notice) {
    return (
      <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 max-w-xs">
        {notice}
        <button
          type="button"
          onClick={() => setNotice('')}
          className="ml-2 underline text-amber-900"
        >
          Dismiss
        </button>
      </div>
    )
  }

  if (mode) {
    return (
      <div className="space-y-1.5 min-w-[15rem]">
        <p className="text-xs text-gray-600">
          {mode === 'refund'
            ? 'Refunds the whole purchase and cancels every ticket on it.'
            : 'Cancels this ticket.'}
        </p>
        <input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (required)"
          maxLength={500}
          className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="text-xs px-2 py-1 rounded-md bg-gray-900 text-white disabled:opacity-50"
          >
            {loading ? 'Working…' : mode === 'refund' ? 'Refund' : 'Cancel ticket'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(null)
              setReason('')
              setError('')
            }}
            className="text-xs px-2 py-1 rounded-md text-gray-500"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-1">
      {showCancel && (
        <button
          type="button"
          onClick={() => setMode('cancel')}
          title={status === 'USED' ? 'Cancel — this ticket was already checked in' : 'Cancel'}
          aria-label="Cancel ticket"
          className="text-gray-400 hover:text-red-600 p-1.5 rounded-md transition-colors"
        >
          <Ban size={15} />
        </button>
      )}
      {showRefund && (
        <button
          type="button"
          onClick={() => setMode('refund')}
          title="Mark the purchase refunded"
          aria-label="Refund purchase"
          className="text-gray-400 hover:text-amber-700 p-1.5 rounded-md transition-colors"
        >
          <Undo2 size={15} />
        </button>
      )}
    </div>
  )
}
