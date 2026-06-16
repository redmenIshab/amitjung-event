'use client'

import { useEffect, useRef, useState } from 'react'

type ScanState =
  | { phase: 'idle' }
  | { phase: 'scanning' }
  | { phase: 'loading'; token: string }
  | { phase: 'result'; result: ScanResult }
  | { phase: 'error'; message: string }

type ScanResult =
  | { valid: true; attendeeName: string | null; distributorName: string | null; category: string; eventName: string }
  | { valid: false; reason: 'NOT_FOUND' | 'CANCELLED' | 'ALREADY_USED'; usedAt?: string }

function extractToken(raw: string): string | null {
  try {
    const url = new URL(raw)
    // Matches /ticket/<token> or /verify/<token>
    const match = url.pathname.match(/\/(?:ticket|verify)\/([^/]+)$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export function ScannerClient() {
  const [state, setState] = useState<ScanState>({ phase: 'idle' })
  const scannerRef = useRef<unknown>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  async function startScanner() {
    setState({ phase: 'scanning' })
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          // Stop scanning immediately to prevent double-reads
          await scanner.stop().catch(() => {})
          scannerRef.current = null

          const token = extractToken(decodedText)
          if (!token) {
            setState({ phase: 'error', message: 'QR code is not a valid ticket URL.' })
            return
          }

          setState({ phase: 'loading', token })
          try {
            const res = await fetch(`/api/verify/${token}`, { method: 'POST' })
            const data: ScanResult = await res.json()
            setState({ phase: 'result', result: data })
          } catch {
            setState({ phase: 'error', message: 'Network error. Please try again.' })
          }
        },
        () => { /* per-frame decode failures are normal */ },
      )
    } catch (err) {
      setState({
        phase: 'error',
        message: err instanceof Error ? err.message : 'Could not access camera.',
      })
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await (scannerRef.current as { stop: () => Promise<void> }).stop()
      } catch { /* already stopped */ }
      scannerRef.current = null
    }
  }

  function reset() {
    stopScanner()
    setState({ phase: 'idle' })
  }

  // ── Result overlay ────────────────────────────────────────────
  if (state.phase === 'result') {
    const { result } = state
    const isValid = result.valid
    const isAlreadyUsed = !result.valid && result.reason === 'ALREADY_USED'
    const isCancelled = !result.valid && result.reason === 'CANCELLED'
    const isNotFound = !result.valid && result.reason === 'NOT_FOUND'

    return (
      <div
        className={`min-h-[60vh] flex flex-col items-center justify-center rounded-2xl p-8 text-center ${
          isValid
            ? 'bg-green-50 border-2 border-green-300'
            : isAlreadyUsed
            ? 'bg-orange-50 border-2 border-orange-300'
            : 'bg-red-50 border-2 border-red-300'
        }`}
      >
        {isValid && result.valid ? (
          <>
            <div className="text-7xl mb-4">✅</div>
            <p className="text-3xl font-black text-green-700 mb-1">VALID</p>
            <p className="text-lg font-semibold text-green-800 mb-1">
              {result.attendeeName ?? result.distributorName ?? 'Ticket Holder'}
            </p>
            <p className="text-green-600 text-sm mb-1">{result.eventName}</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase mt-1 ${
                result.category === 'VIP'
                  ? 'bg-amber-200 text-amber-800'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {result.category}
            </span>
            <p className="text-green-500 text-xs mt-3">Checked in ✓</p>
          </>
        ) : isAlreadyUsed ? (
          <>
            <div className="text-7xl mb-4">🔴</div>
            <p className="text-3xl font-black text-orange-700 mb-2">ALREADY USED</p>
            {!result.valid && result.usedAt && (
              <p className="text-orange-600 text-sm">
                Checked in at{' '}
                {new Date(result.usedAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            )}
          </>
        ) : isCancelled ? (
          <>
            <div className="text-7xl mb-4">❌</div>
            <p className="text-3xl font-black text-red-700 mb-2">CANCELLED</p>
            <p className="text-red-500 text-sm">This ticket has been cancelled.</p>
          </>
        ) : isNotFound ? (
          <>
            <div className="text-7xl mb-4">❓</div>
            <p className="text-3xl font-black text-red-700 mb-2">INVALID</p>
            <p className="text-red-500 text-sm">Ticket not found in the system.</p>
          </>
        ) : null}

        <button
          onClick={reset}
          className="mt-8 px-8 py-3 bg-gray-900 text-white rounded-xl font-semibold text-lg hover:bg-gray-700 transition-colors"
        >
          Scan Next
        </button>
      </div>
    )
  }

  // ── Error state ───────────────────────────────────────────────
  if (state.phase === 'error') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center rounded-2xl bg-yellow-50 border-2 border-yellow-300 p-8 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <p className="text-xl font-bold text-yellow-800 mb-2">Error</p>
        <p className="text-yellow-700 text-sm mb-6">{state.message}</p>
        <button
          onClick={reset}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  // ── Loading ───────────────────────────────────────────────────
  if (state.phase === 'loading') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center rounded-2xl bg-blue-50 border-2 border-blue-200 p-8 text-center">
        <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <p className="text-blue-700 font-medium">Verifying ticket…</p>
      </div>
    )
  }

  // ── Scanning (camera live) ────────────────────────────────────
  if (state.phase === 'scanning') {
    return (
      <div className="space-y-4">
        <div
          id="qr-reader"
          ref={containerRef}
          className="w-full max-w-sm mx-auto rounded-xl overflow-hidden"
        />
        <div className="text-center">
          <button
            onClick={reset}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  // ── Idle ──────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
        <svg
          className="w-12 h-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2"
          />
          <rect x="7" y="7" width="4" height="4" strokeWidth={1.5} />
          <rect x="13" y="7" width="4" height="4" strokeWidth={1.5} />
          <rect x="7" y="13" width="4" height="4" strokeWidth={1.5} />
          <path strokeLinecap="round" strokeWidth={1.5} d="M13 13h4v4" />
        </svg>
      </div>
      <div>
        <p className="text-xl font-bold text-gray-800 mb-1">Ticket Scanner</p>
        <p className="text-sm text-gray-500">
          Point the camera at a ticket QR code to check in the attendee.
        </p>
      </div>
      <button
        onClick={startScanner}
        className="px-8 py-3 bg-gray-900 text-white rounded-xl font-semibold text-lg hover:bg-gray-700 transition-colors"
      >
        Start Camera
      </button>
    </div>
  )
}
