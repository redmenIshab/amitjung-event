'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { buildAnalyticsPdf, type AnalyticsPdfInput } from '@/lib/analyticsPdf'

/**
 * Generates the analytics PDF in the browser.
 *
 * `input` arrives already filtered by the server: a viewer without FINANCE_READ
 * gets `money: null`, so the restricted figures are never sent to the client at
 * all rather than being hidden in the UI.
 *
 * Charts are read out of the live DOM, so this must render on the same page as
 * them — and it waits a frame before capturing to be sure they have painted.
 */
export function DownloadAnalyticsPdf({ input }: { input: AnalyticsPdfInput }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setBusy(true)
    setError('')
    try {
      // Let the spinner paint before the synchronous PDF work blocks the thread.
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      await buildAnalyticsPdf(input)
    } catch (e) {
      console.error('Analytics PDF failed:', e)
      setError('Could not generate the PDF. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-black/10 rounded-md px-2.5 py-1.5 transition-colors disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
        {busy ? 'Preparing…' : 'Download PDF'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
