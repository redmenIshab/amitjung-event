'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/marketing/ui/Button'

/* Deterministic QR-ish fill so SSR and client match */
const DARK = new Set([0, 1, 8, 9, 14, 15, 16, 17, 22, 23, 48, 49, 56, 57, 62, 63, 6, 7, 13, 55, 27, 36, 41])

function useCountUp(target: number, ms = 1600) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min((t - start) / ms, 1)
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return n
}

function StatStrip() {
  const scans = useCountUp(1000000)
  const fmt = (n: number) => (n >= 1000000 ? `${(n / 100000).toFixed(0)}L+` : n.toLocaleString())
  const stats = [
    { v: fmt(scans), l: 'Concurrent scans' },
    { v: '1', l: 'Unique QR / ticket' },
    { v: '0', l: 'Duplicates allowed' },
    { v: 'Live', l: 'Check-in status' },
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-coal/30 gold-border rounded-sm overflow-hidden mt-14 max-w-3xl">
      {stats.map((s) => (
        <div key={s.l} className="bg-bg px-5 py-6">
          <p className="font-bebas text-gold text-4xl leading-none mb-2">{s.v}</p>
          <p className="font-dm-mono text-[10px] text-ash tracking-wider uppercase">{s.l}</p>
        </div>
      ))}
    </div>
  )
}

export default function TicketingHero() {
  return (
    <section className="relative overflow-hidden bg-bg px-4 md:px-20 pt-36 pb-24">
      <div className="max-w-[1400px] mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="section-label mb-5">SMART TICKETING · FOR ORGANIZERS</p>
          <h1
            className="font-cormorant font-bold text-ivory leading-[0.98] mb-8"
            style={{ fontSize: 'clamp(40px, 7vw, 88px)' }}
          >
            Ticketing built to survive the <span className="gold-text italic">rush.</span>
          </h1>
          <p className="text-ash text-lg leading-relaxed max-w-xl mb-10">
            We design, print and manage your entire ticketing operation &mdash; unique tamper-proof
            QR codes, on-ground distribution stalls, and a real-time scanner that holds up when a
            hundred thousand people show up at once. You run the event; we run the gate.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button href="/contact" variant="gold">REQUEST A DEMO →</Button>
            <Button href="#scanner" variant="outline">SEE THE SCANNER</Button>
          </div>
          <StatStrip />
        </div>

        {/* Animated ticket */}
        <div className="flex justify-center">
          <div className="relative w-[300px] md:w-[340px] bg-surface gold-border rounded-md overflow-hidden">
            {/* stub divider */}
            <div className="absolute top-0 bottom-0 right-24 border-l border-dashed border-coal/60" />
            <span className="absolute -top-2.5 right-24 -translate-x-1/2 w-5 h-5 rounded-full bg-bg" />
            <span className="absolute -bottom-2.5 right-24 -translate-x-1/2 w-5 h-5 rounded-full bg-bg" />

            <div className="p-6 pr-28">
              <p className="font-dm-mono text-[10px] text-gold tracking-widest mb-3">ADMIT ONE</p>
              <p className="font-cormorant font-bold text-ivory text-2xl leading-tight mb-1">Nepal Music Festival</p>
              <p className="font-dm-mono text-[10px] text-ash mb-6">GATE A · 2026</p>
              <div className="flex items-center gap-2">
                <span className="font-dm-mono text-[9px] text-ash">UNIQUE</span>
                <span className="w-1 h-1 rounded-full bg-gold" />
                <span className="font-dm-mono text-[9px] text-ash">ONE-TIME</span>
                <span className="w-1 h-1 rounded-full bg-gold" />
                <span className="font-dm-mono text-[9px] text-ash">SIGNED</span>
              </div>
            </div>

            {/* QR stub */}
            <div className="absolute top-0 bottom-0 right-0 w-24 flex flex-col items-center justify-center gap-2 bg-bg">
              <div className="relative w-16 h-16 grid grid-cols-8 grid-rows-8 gap-[1px] p-1 border border-gold/40 rounded-sm">
                {Array.from({ length: 64 }, (_, i) => (
                  <div key={i} className={`rounded-[0.5px] ${DARK.has(i) ? 'bg-gold/80' : i % 3 === 0 ? 'bg-ash/30' : ''}`} />
                ))}
                <div
                  className="absolute left-1 right-1 h-[2px] bg-gold/80"
                  style={{ boxShadow: '0 0 8px rgba(200,146,42,0.8)', animation: 'scanDown 2.6s linear infinite' }}
                />
              </div>
              <p className="font-dm-mono text-[8px] text-ash rotate-0">#LY-8F2A</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanDown {
          0% { top: 4px; opacity: 1; }
          80% { top: calc(100% - 6px); opacity: 1; }
          90% { opacity: 0; }
          100% { top: calc(100% - 6px); opacity: 0; }
        }
      `}</style>
    </section>
  )
}
