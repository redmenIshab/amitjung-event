'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DigitalTicket } from '@/components/tickets/DigitalTicket'
import { captureTicketPdf } from '@/lib/captureTicketPdf'
import type { BulkTicketResult } from '@/app/api/events/[eventId]/tickets/bulk/route'

type Row = { name: string; email: string }
type InputMode = 'csv' | 'manual'
type Stage = 'input' | 'generating' | 'results'

function parseCSV(text: string): Row[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .flatMap((line) => {
      if (/^(name|attendee)[,\t]/i.test(line)) return []
      const parts = line.split(/,|\t/)
      const name = parts[0]?.trim() ?? ''
      const email = parts[1]?.trim() ?? ''
      if (!name || !email) return []
      return [{ name, email }]
    })
}

export function BulkTicketForm({ eventId, eventName }: { eventId: string; eventName?: string }) {
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)
  // One ref slot per generated ticket — populated by callback refs
  const ticketRefs = useRef<(HTMLDivElement | null)[]>([])

  const [inputMode,     setInputMode]     = useState<InputMode>('csv')
  const [stage,         setStage]         = useState<Stage>('input')
  const [csvError,      setCsvError]      = useState('')
  const [rows,          setRows]          = useState<Row[]>([])
  const [manualRows,    setManualRows]    = useState<Row[]>([{ name: '', email: '' }])
  const [results,       setResults]       = useState<BulkTicketResult[]>([])
  const [generateError, setGenerateError] = useState('')

  // PDF state
  const [pdfProgress,  setPdfProgress]  = useState<{ current: number; total: number } | null>(null)
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null)

  // ── CSV ──────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError('')
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target?.result as string)
      if (parsed.length === 0) {
        setCsvError('No valid rows found. Expected format: Name,Email (one per line).')
        setRows([])
      } else if (parsed.length > 200) {
        setCsvError('Maximum 200 tickets per batch.')
        setRows([])
      } else {
        setRows(parsed)
        setCsvError('')
      }
    }
    reader.readAsText(file)
  }

  function updateManualRow(idx: number, field: 'name' | 'email', value: string) {
    setManualRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }
  function addRow()          { setManualRows((p) => [...p, { name: '', email: '' }]) }
  function removeRow(idx: number) { setManualRows((p) => p.filter((_, i) => i !== idx)) }

  const previewRows: Row[] =
    inputMode === 'csv'
      ? rows
      : manualRows.filter((r) => r.name.trim() && r.email.trim())

  // ── Generate ─────────────────────────────────────────────────
  async function handleGenerate() {
    if (previewRows.length === 0) return
    setStage('generating')
    setGenerateError('')

    const res = await fetch(`/api/events/${eventId}/tickets/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tickets: previewRows.map((r) => ({ attendeeName: r.name, attendeeEmail: r.email })),
      }),
    })

    if (res.ok) {
      const data = await res.json()
      ticketRefs.current = new Array(data.results.length).fill(null)
      setResults(data.results)
      setStage('results')
      router.refresh()
    } else {
      const data = await res.json()
      setGenerateError(typeof data.error === 'string' ? data.error : 'Bulk generation failed')
      setStage('input')
    }
  }

  function reset() {
    setStage('input')
    setRows([])
    setManualRows([{ name: '', email: '' }])
    setResults([])
    setGenerateError('')
    setCsvError('')
    ticketRefs.current = []
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── Individual PDF download ──────────────────────────────────
  async function handleDownloadOne(idx: number) {
    const el = ticketRefs.current[idx]
    if (!el) return
    setDownloadingIdx(idx)
    try {
      const base64 = await captureTicketPdf(el)
      const r = results[idx]
      const name = (r.attendeeName ?? `ticket-${idx + 1}`).replace(/\s+/g, '-').toLowerCase()
      const link = document.createElement('a')
      link.href = `data:application/pdf;base64,${base64}`
      link.download = `${String(idx + 1).padStart(3, '0')}-${name}.pdf`
      link.click()
    } finally {
      setDownloadingIdx(null)
    }
  }

  // ── Download all PDFs as ZIP ─────────────────────────────────
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
        const r    = results[i]
        const name = (r.attendeeName ?? `ticket-${i + 1}`).replace(/\s+/g, '-').toLowerCase()
        zip.file(`${String(i + 1).padStart(3, '0')}-${name}.pdf`, base64, { base64: true })
        setPdfProgress({ current: i + 1, total })
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url  = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href     = url
      link.download = `tickets-pdf.zip`
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfProgress(null)
    }
  }

  // ── Results ───────────────────────────────────────────────────
  if (stage === 'results') {
    const succeeded = results.filter((r) => r.emailSent).length
    const failed    = results.filter((r) => !r.emailSent).length
    const busy      = pdfProgress !== null || downloadingIdx !== null

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-green-600 font-medium">
            {results.length} ticket{results.length !== 1 ? 's' : ''} generated!
          </p>
          {succeeded > 0 && <Badge variant="default">{succeeded} emailed</Badge>}
          {failed    > 0 && <Badge variant="secondary">{failed} email failed</Badge>}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 items-center">
          <Button
            size="sm"
            onClick={handleDownloadAllPdfs}
            disabled={busy}
          >
            {pdfProgress
              ? `Generating ${pdfProgress.current}/${pdfProgress.total}…`
              : '⬇ Download All PDFs (ZIP)'}
          </Button>
          <Button size="sm" variant="outline" onClick={reset} disabled={busy}>
            Generate Another Batch
          </Button>
        </div>

        {/* Results table */}
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((r, i) => (
                <tr key={r.ticketId} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-gray-900">{r.attendeeName ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{r.attendeeEmail ?? '—'}</td>
                  <td className="px-4 py-2">
                    {r.emailSent
                      ? <Badge variant="default">Sent</Badge>
                      : <Badge variant="secondary" title={r.error}>Not sent</Badge>}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDownloadOne(i)}
                      disabled={busy}
                      className="text-xs text-blue-600 hover:underline disabled:opacity-40"
                    >
                      {downloadingIdx === i ? 'Generating…' : 'Download PDF'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Off-screen ticket renders for html2canvas capture */}
        <div
          aria-hidden
          style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none' }}
        >
          {results.map((r, i) => (
            <DigitalTicket
              key={r.ticketId}
              ref={(el) => { ticketRefs.current[i] = el }}
              attendeeName={r.attendeeName}
              category={r.category}
              ticketId={r.ticketId}
              qrCodeDataUrl={r.qrCodeDataUrl}
            />
          ))}
        </div>
      </div>
    )
  }

  // ── Generating spinner ────────────────────────────────────────
  if (stage === 'generating') {
    return (
      <div className="flex items-center gap-3 py-8 text-gray-500">
        <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        Generating {previewRows.length} ticket{previewRows.length !== 1 ? 's' : ''}…
      </div>
    )
  }

  // ── Input ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="inline-flex rounded-lg border overflow-hidden text-sm">
        {(['csv', 'manual'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setInputMode(mode)}
            className={`px-4 py-2 font-medium transition-colors ${mode === 'manual' ? 'border-l' : ''} ${
              inputMode === mode ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {mode === 'csv' ? 'Upload CSV' : 'Enter Manually'}
          </button>
        ))}
      </div>

      {inputMode === 'csv' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="csvFile">CSV File</Label>
            <p className="text-xs text-gray-400">
              One attendee per line:{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">Name,Email</span>. Max 200 rows.
            </p>
            <Input id="csvFile" ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFileChange} />
          </div>
          {csvError && <p className="text-sm text-red-600">{csvError}</p>}
        </div>
      )}

      {inputMode === 'manual' && (
        <div className="space-y-2">
          {manualRows.map((row, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <Input placeholder="Name" value={row.name} onChange={(e) => updateManualRow(idx, 'name', e.target.value)} className="flex-1" />
              <Input type="email" placeholder="email@example.com" value={row.email} onChange={(e) => updateManualRow(idx, 'email', e.target.value)} className="flex-1" />
              <button
                type="button"
                onClick={() => removeRow(idx)}
                disabled={manualRows.length === 1}
                className="text-gray-400 hover:text-red-500 disabled:opacity-30 px-2 text-lg leading-none self-center"
              >×</button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addRow}>+ Add Row</Button>
        </div>
      )}

      {previewRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Preview — {previewRows.length} ticket{previewRows.length !== 1 ? 's' : ''}
          </p>
          <div className="border rounded-lg overflow-x-auto max-h-56 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wide sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {previewRows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-1.5 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-1.5 font-medium">{r.name}</td>
                    <td className="px-4 py-1.5 text-gray-500">{r.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {generateError && <p className="text-sm text-red-600">{generateError}</p>}
      <Button onClick={handleGenerate} disabled={previewRows.length === 0}>
        Generate {previewRows.length > 0 ? previewRows.length : ''} Ticket{previewRows.length !== 1 ? 's' : ''}
      </Button>
    </div>
  )
}
