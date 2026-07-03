'use client'

import { useEffect, useRef, useState } from 'react'

type Kind = 'valid' | 'dup' | 'invalid'

const SEQ: { kind: Kind; code: string; label: string; sub: string }[] = [
  { kind: 'valid',   code: '#LY-8F2A', label: 'CHECKED IN',   sub: 'Valid · first scan' },
  { kind: 'dup',     code: '#LY-2C71', label: 'ALREADY USED', sub: 'One-time QR · re-entry blocked' },
  { kind: 'valid',   code: '#LY-9AB0', label: 'CHECKED IN',   sub: 'Valid · first scan' },
  { kind: 'invalid', code: '#LY-0000', label: 'INVALID',      sub: 'Tampered / unknown code' },
  { kind: 'valid',   code: '#LY-5D3E', label: 'CHECKED IN',   sub: 'Valid · first scan' },
]

const STYLE: Record<Kind, { color: string; glow: string; icon: string }> = {
  valid:   { color: '#4ADE80', glow: 'rgba(74,222,128,0.5)',  icon: '✓' },
  dup:     { color: '#F5C842', glow: 'rgba(245,200,66,0.5)',  icon: '⟳' },
  invalid: { color: '#F87171', glow: 'rgba(248,113,113,0.5)', icon: '✕' },
}

const LEGEND: { kind: Kind; label: string }[] = [
  { kind: 'valid', label: 'Checked in — valid ticket' },
  { kind: 'dup', label: 'Already used — duplicate blocked' },
  { kind: 'invalid', label: 'Invalid — fake or tampered' },
]

export default function ScannerStatus() {
  const [view, setView] = useState<{ i: number; phase: 'scan' | 'result' }>({ i: 0, phase: 'scan' })
  const [counts, setCounts] = useState({ in: 42104, dup: 631, bad: 118 })
  const startRef = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)

  // Only run the loop once the section is in view
  useEffect(() => {
    const el = startRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStarted(true); io.disconnect() } },
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return
    let alive = true
    let tid: ReturnType<typeof setTimeout>
    const run = (i: number) => {
      if (!alive) return
      setView({ i, phase: 'scan' })
      tid = setTimeout(() => {
        if (!alive) return
        setView({ i, phase: 'result' })
        const k = SEQ[i].kind
        setCounts((c) => ({
          in: c.in + (k === 'valid' ? 1 : 0),
          dup: c.dup + (k === 'dup' ? 1 : 0),
          bad: c.bad + (k === 'invalid' ? 1 : 0),
        }))
        tid = setTimeout(() => run((i + 1) % SEQ.length), 1700)
      }, 1050)
    }
    run(0)
    return () => { alive = false; clearTimeout(tid) }
  }, [started])

  const cur = SEQ[view.i]
  const st = STYLE[cur.kind]
  const showResult = view.phase === 'result'

  return (
    <section id="scanner" ref={startRef} className="py-24 md:py-32 px-4 md:px-20 bg-surface overflow-hidden">
      <div className="max-w-[1400px] mx-auto grid md:grid-cols-2 gap-16 items-center">
        {/* Copy + counters */}
        <div>
          <p className="section-label mb-3">THE SCANNER</p>
          <h2 className="font-cormorant font-bold text-ivory mb-6 leading-tight" style={{ fontSize: 'var(--t-display)' }}>
            See every scan, live.
          </h2>
          <p className="text-ash text-lg leading-relaxed mb-8">
            Every code is validated on our servers the instant it&rsquo;s scanned. Your gate staff
            see a clear, colour-coded result &mdash; and you watch the whole operation update in real
            time from one dashboard.
          </p>

          {/* Legend */}
          <ul className="flex flex-col gap-3 mb-8">
            {LEGEND.map((l) => (
              <li key={l.kind} className="flex items-center gap-3 text-ash text-sm">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: STYLE[l.kind].color, boxShadow: `0 0 8px ${STYLE[l.kind].glow}` }}
                />
                {l.label}
              </li>
            ))}
          </ul>

          {/* Live counters */}
          <div className="grid grid-cols-3 gap-px bg-coal/30 gold-border rounded-sm overflow-hidden max-w-md">
            {[
              { v: counts.in, l: 'Checked in', c: '#4ADE80' },
              { v: counts.dup, l: 'Duplicates blocked', c: '#F5C842' },
              { v: counts.bad, l: 'Invalid', c: '#F87171' },
            ].map((s) => (
              <div key={s.l} className="bg-bg px-4 py-5">
                <p className="font-bebas text-3xl leading-none mb-1" style={{ color: s.c }}>
                  {s.v.toLocaleString()}
                </p>
                <p className="font-dm-mono text-[9px] text-ash tracking-wider uppercase">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scanner viewport */}
        <div className="flex justify-center">
          <div className="relative w-[280px] h-[440px] rounded-[28px] border border-coal bg-bg p-3 shadow-2xl">
            {/* notch */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-1.5 rounded-full bg-coal/60" />
            <div className="relative w-full h-full rounded-[18px] overflow-hidden bg-[#0b0b0b] flex flex-col">
              {/* header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-coal/40">
                <span className="font-bebas text-ivory tracking-widest text-sm">GATE SCANNER</span>
                <span className="font-dm-mono text-[9px] text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> LIVE
                </span>
              </div>

              {/* camera area */}
              <div className="relative flex-1 flex items-center justify-center">
                {/* corner brackets */}
                <div className="absolute w-40 h-40">
                  {['top-0 left-0 border-t-2 border-l-2', 'top-0 right-0 border-t-2 border-r-2', 'bottom-0 left-0 border-b-2 border-l-2', 'bottom-0 right-0 border-b-2 border-r-2'].map((c) => (
                    <span key={c} className={`absolute w-6 h-6 ${c}`} style={{ borderColor: showResult ? st.color : '#C8922A', transition: 'border-color 250ms' }} />
                  ))}
                </div>

                {/* scanning: QR + line */}
                {!showResult && (
                  <div className="relative w-28 h-28 grid grid-cols-8 grid-rows-8 gap-[2px]">
                    {Array.from({ length: 64 }, (_, i) => (
                      <div key={i} className={`rounded-[1px] ${[0,1,8,9,14,15,22,48,49,56,62,63,6,7,27,36].includes(i) ? 'bg-gold/80' : i % 3 === 0 ? 'bg-ash/25' : ''}`} />
                    ))}
                    <div className="absolute left-0 right-0 h-[2px] bg-gold/80" style={{ boxShadow: '0 0 8px rgba(200,146,42,0.8)', animation: 'scanSweep 1s ease-in-out infinite' }} />
                  </div>
                )}

                {/* result */}
                {showResult && (
                  <div className="text-center px-4" style={{ animation: 'popIn 300ms steps(3, end) both' }}>
                    <div
                      className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
                      style={{ color: st.color, border: `2px solid ${st.color}`, boxShadow: `0 0 24px ${st.glow}` }}
                    >
                      {st.icon}
                    </div>
                    <p className="font-bebas tracking-widest text-2xl" style={{ color: st.color }}>{cur.label}</p>
                    <p className="font-dm-mono text-[11px] text-ivory mt-1">{cur.code}</p>
                    <p className="font-dm-mono text-[10px] text-ash mt-1">{cur.sub}</p>
                  </div>
                )}
              </div>

              {/* footer hint */}
              <div className="px-4 py-3 border-t border-coal/40 text-center">
                <span className="font-dm-mono text-[9px] text-ash tracking-wider">
                  {showResult ? 'NEXT TICKET…' : 'HOLD QR IN FRAME'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanSweep {
          0%, 100% { top: 0; }
          50% { top: calc(100% - 2px); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </section>
  )
}
