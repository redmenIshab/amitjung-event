'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DigitalTicket } from '@/components/tickets/DigitalTicket'
import { captureTicketPdf } from '@/lib/captureTicketPdf'
import type { DistributorTicketResult } from '@/app/api/events/[eventId]/tickets/distributor/route'

type Stage = 'input' | 'generating' | 'results'

export function DistributorTicketForm({
  eventId,
  eventName,
}: {
  eventId: string
  eventName?: string
}) {
  const router = useRouter()
  const ticketRefs = useRef<(HTMLDivElement | null)[]>([])

  const [stage,          setStage]          = useState<Stage>('input')
  const [distributorName, setDistributorName] = useState('')
  const [quantity,       setQuantity]       = useState(10)
  const [category,       setCategory]       = useState<'GENERAL' | 'VIP'>('GENERAL')
  const [results,        setResults]        = useState<DistributorTicketResult[]>([])
  const [error,          setError]          = useState('')

  // PDF state
  const [pdfProgress,    setPdfProgress]    = useState<{ current: number; total: number } | null>(null)
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null)

  // ── Generate ─────────────────────────────────────────────────
  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!distributorName.trim()) return
    setStage('generating')
    setError('')

    const res = await fetch(`/api/events/${eventId}/tickets/distributor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ distributorName: distributorName.trim(), quantity, category }),
    })

    if (res.ok) {
      const data = await res.json()
      ticketRefs.current = new Array(data.results.length).fill(null)
      setResults(data.results)
      setStage('results')
      router.refresh()
    } else {
      const data = await res.json()
      setError(typeof data.error === 'string' ? data.error : 'Generation failed')
      setStage('input')
    }
  }

  function reset() {
    setStage('input')
    setResults([])
    setError('')
    setDistributorName('')
    setQuantity(10)
    setCategory('GENERAL')
    ticketRefs.current = []
  }

  // ── Individual PDF ────────────────────────────────────────────
  async function handleDownloadOne(idx: number) {
    const el = ticketRefs.current[idx]
    if (!el) return
    setDownloadingIdx(idx)
    try {
      const base64 = await captureTicketPdf(el)
      const r      = results[idx]
      const link   = document.createElement('a')
      link.href     = `data:application/pdf;base64,${base64}`
      link.download = `ticket-${String(r.ticketNumber).padStart(3, '0')}-${r.category}.pdf`
      link.click()
    } finally {
      setDownloadingIdx(null)
    }
  }

  // ── Download all PDFs (ZIP) ───────────────────────────────────
  async function handleDownloadAllPdfs() {
    const total = results.length
    setPdfProgress({ current: 0, total })
    try {
      const JSZip = (await import('jszip')).default
      const zip   = new JSZip()

      for (let i = 0; i < total; i++) {
        const el = ticketRefs.current[i]
        if (!el) continue
        const base64 = await captureTicketPdf(el)
        const r      = results[i]
        zip.file(
          `ticket-${String(r.ticketNumber).padStart(3, '0')}-${r.category}.pdf`,
          base64,
          { base64: true },
        )
        setPdfProgress({ current: i + 1, total })
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href     = url
      link.download = `${distributorName.replace(/\s+/g, '-')}-tickets-pdf.zip`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfProgress(null)
    }
  }

  // ── Download all QR images (ZIP) — kept for convenience ──────
  async function handleDownloadAllQr() {
    try {
      const JSZip  = (await import('jszip')).default
      const zip    = new JSZip()
      const folder = zip.folder(`${distributorName.replace(/\s+/g, '-')}-qr`)!
      results.forEach((r) => {
        folder.file(
          `ticket-${String(r.ticketNumber).padStart(3, '0')}-${r.category}.png`,
          r.qrCodeDataUrl.split(',')[1],
          { base64: true },
        )
      })
      const blob = await zip.generateAsync({ type: 'blob' })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href     = url
      link.download = `${distributorName.replace(/\s+/g, '-')}-qr.zip`
      link.click()
      URL.revokeObjectURL(url)
    } catch { /* silent */ }
  }

  // ── Results ───────────────────────────────────────────────────
  if (stage === 'results') {
    const busy = pdfProgress !== null || downloadingIdx !== null

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-900">
              {results.length} tickets for{' '}
              <span className="text-blue-600">{distributorName}</span>
            </p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              {eventName} ·{' '}
              <Badge variant={category === 'VIP' ? 'default' : 'secondary'} className="text-xs">
                {category}
              </Badge>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={handleDownloadAllPdfs} disabled={busy}>
              {pdfProgress
                ? `PDF ${pdfProgress.current}/${pdfProgress.total}…`
                : '⬇ All PDFs (ZIP)'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownloadAllQr} disabled={busy}>
              QR ZIP
            </Button>
            <Button size="sm" variant="outline" onClick={reset} disabled={busy}>
              New Batch
            </Button>
          </div>
        </div>

        {/* QR + PDF grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {results.map((r, i) => (
            <div key={r.ticketId} className="border rounded-lg p-3 bg-white space-y-2 text-center">
              <img
                src={r.qrCodeDataUrl}
                alt={`Ticket #${r.ticketNumber}`}
                className="w-full aspect-square object-contain"
              />
              <p className="text-xs font-medium text-gray-700">#{r.ticketNumber}</p>
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleDownloadOne(i)}
                  disabled={busy}
                  className="text-xs text-blue-600 hover:underline disabled:opacity-40"
                >
                  {downloadingIdx === i ? 'Generating…' : 'Download PDF'}
                </button>
                <a
                  href={r.qrCodeDataUrl}
                  download={`ticket-${String(r.ticketNumber).padStart(3, '0')}-${r.category}.png`}
                  className="text-xs text-gray-400 hover:underline"
                >
                  QR only
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Off-screen ticket renders */}
        <div
          aria-hidden
          style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}
        >
          {results.map((r, i) => (
            <DigitalTicket
              key={r.ticketId}
              ref={(el) => { ticketRefs.current[i] = el }}
              attendeeName={`Ticket #${r.ticketNumber}`}
              category={r.category}
              ticketId={r.ticketId}
              qrCodeDataUrl={r.qrCodeDataUrl}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Generating ────────────────────────────────────────────────
  if (stage === 'generating') {
    return (
      <div className="flex items-center gap-3 py-10 text-gray-500">
        <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Generating {quantity} tickets…
      </div>
    )
  }

  // ── Input form ────────────────────────────────────────────────
  return (
    <form onSubmit={handleGenerate} className="max-w-sm space-y-4">
      <div className="space-y-1">
        <Label htmlFor="distributorName">Distributor / Batch Name</Label>
        <Input
          id="distributorName"
          placeholder="e.g. VIP Box Office, Press Pass"
          value={distributorName}
          onChange={(e) => setDistributorName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="quantity">Number of Tickets</Label>
        <Input
          id="quantity"
          type="number"
          min={1}
          max={500}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Math.min(500, Number(e.target.value))))}
          required
        />
        <p className="text-xs text-gray-400">Maximum 500 per batch</p>
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

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={!distributorName.trim()}>
        Generate {quantity} Ticket{quantity !== 1 ? 's' : ''}
      </Button>
    </form>
  )
}
