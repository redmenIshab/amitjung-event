'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DigitalTicket } from '@/components/tickets/DigitalTicket'
import { captureTicketPdf } from '@/lib/captureTicketPdf'

type GeneratedTicket = {
  id: string
  token: string
  qrCodeDataUrl: string
  attendeeName: string
  attendeeEmail: string
  category: 'GENERAL' | 'VIP'
}

type PdfStatus = 'idle' | 'generating' | 'sending' | 'sent' | 'error'

export function TicketForm({
  eventId,
  eventName,
  eventVenue,
  eventDate,
  emailEnabled = false,
}: {
  eventId: string
  eventName?: string
  eventVenue?: string
  eventDate?: string
  emailEnabled?: boolean
}) {
  const router     = useRouter()
  const ticketRef  = useRef<HTMLDivElement>(null)

  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [generated,     setGenerated]     = useState<GeneratedTicket | null>(null)
  const [category,      setCategory]      = useState<'GENERAL' | 'VIP'>('GENERAL')
  const [digitalTicket, setDigitalTicket] = useState(true)
  const [pdfStatus,     setPdfStatus]     = useState<PdfStatus>('idle')
  const [pdfError,      setPdfError]      = useState('')

  // ── Ticket generation ────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const res = await fetch(`/api/events/${eventId}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attendeeName: form.get('attendeeName') as string,
        attendeeEmail: form.get('attendeeEmail') as string,
        category,
      }),
    })

    if (res.ok) {
      const ticket = await res.json()
      setGenerated({ ...ticket, category })
      router.refresh()
    } else {
      const data = await res.json()
      setError(typeof data.error === 'string' ? data.error : 'Failed to generate ticket')
    }
    setLoading(false)
  }

  // ── PDF build ────────────────────────────────────────────────
  async function buildPdf(): Promise<string> {
    if (!ticketRef.current) throw new Error('Ticket ref not ready')
    return captureTicketPdf(ticketRef.current)
  }

  async function handleDownloadPDF() {
    if (!generated) return
    setPdfStatus('generating')
    setPdfError('')
    try {
      const base64 = await buildPdf()
      const link = document.createElement('a')
      link.href = `data:application/pdf;base64,${base64}`
      link.download = `ticket-${generated.attendeeName.replace(/\s+/g, '-').toLowerCase()}.pdf`
      link.click()
      setPdfStatus('idle')
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Failed to generate PDF')
      setPdfStatus('error')
    }
  }

  async function handleSendPDF() {
    if (!generated) return
    setPdfStatus('generating')
    setPdfError('')
    try {
      const base64 = await buildPdf()
      setPdfStatus('sending')
      const res = await fetch(`/api/events/${eventId}/tickets/${generated.id}/send-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64 }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to send')
      }
      setPdfStatus('sent')
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Failed to send PDF')
      setPdfStatus('error')
    }
  }

  // ── Success state ─────────────────────────────────────────────
  if (generated) {
    const busy = pdfStatus === 'generating' || pdfStatus === 'sending'
    return (
      <div className="space-y-5">
        <p className="text-green-600 font-medium">
          ✓ Ticket generated{emailEnabled && generated.attendeeEmail ? ' and QR emailed!' : '!'}
        </p>

        {digitalTicket && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">Digital Ticket</p>

            {/* Horizontally scrollable on small screens */}
            <div className="overflow-x-auto pb-2">
              <DigitalTicket
                ref={ticketRef}
                attendeeName={generated.attendeeName}
                category={generated.category}
                ticketId={generated.id}
                qrCodeDataUrl={generated.qrCodeDataUrl}
              />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Button onClick={handleDownloadPDF} disabled={busy} size="sm">
                {pdfStatus === 'generating' ? 'Generating PDF…' : '⬇ Download PDF'}
              </Button>

              {emailEnabled ? (
                <Button
                  onClick={handleSendPDF}
                  disabled={busy || pdfStatus === 'sent'}
                  variant="outline"
                  size="sm"
                >
                  {pdfStatus === 'sending'  ? 'Sending…'
                    : pdfStatus === 'sent'  ? '✓ PDF Sent to Email'
                    : '✉ Send PDF to Email'}
                </Button>
              ) : (
                <span className="text-xs text-gray-400 italic">
                  Email disabled — download PDF to share manually
                </span>
              )}

              {pdfError && <p className="text-xs text-red-500">{pdfError}</p>}
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => { setGenerated(null); setPdfStatus('idle') }}
        >
          Generate Another
        </Button>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <div className="space-y-1">
        <Label htmlFor="attendeeName">Attendee Name</Label>
        <Input id="attendeeName" name="attendeeName" placeholder="Jane Doe" required />
      </div>

      <div className="space-y-1">
        <Label htmlFor="attendeeEmail">Attendee Email</Label>
        <Input
          id="attendeeEmail"
          name="attendeeEmail"
          type="email"
          placeholder="jane@example.com"
          required
        />
      </div>

      <div className="space-y-1">
        <Label>Category</Label>
        <div className="flex gap-2">
          {(['GENERAL', 'VIP'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                category === cat
                  ? cat === 'VIP'
                    ? 'bg-amber-400 border-amber-400 text-amber-900'
                    : 'bg-gray-900 border-gray-900 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Digital ticket toggle */}
      <div className="flex items-center gap-2 py-1">
        <input
          id="digitalTicket"
          type="checkbox"
          checked={digitalTicket}
          onChange={(e) => setDigitalTicket(e.target.checked)}
          className="h-4 w-4 accent-gray-900"
        />
        <Label htmlFor="digitalTicket" className="cursor-pointer">
          Generate Digital Ticket PDF
        </Label>
        <span className="text-xs text-gray-400">
          {emailEnabled ? '(download & email)' : '(download only)'}
        </span>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={loading}>
        {loading ? 'Generating…' : 'Generate Ticket'}
      </Button>
    </form>
  )
}
