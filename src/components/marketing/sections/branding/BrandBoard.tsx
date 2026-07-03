'use client'

import { useEffect, useRef, useState } from 'react'

const SWATCHES = [
  { name: 'Ink',    hex: '#0E1522' },
  { name: 'Gold',   hex: '#C8922A' },
  { name: 'Bone',   hex: '#E8E2D5' },
  { name: 'Clay',   hex: '#B4443C' },
  { name: 'Sage',   hex: '#6B8F71' },
]

const TYPES = [
  { face: 'font-cormorant italic', label: 'Display · Cormorant' },
  { face: 'font-bebas tracking-wide', label: 'Impact · Bebas Neue' },
  { face: 'font-dm-sans', label: 'Body · DM Sans' },
]

export default function BrandBoard() {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } },
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={ref} className="py-24 md:py-32 px-4 md:px-20 bg-surface overflow-hidden">
      <div className="max-w-[1400px] mx-auto grid md:grid-cols-2 gap-14 items-center">
        {/* Copy */}
        <div>
          <p className="section-label mb-3">THE IDENTITY SYSTEM</p>
          <h2
            className="font-cormorant font-bold text-ivory mb-6 leading-tight"
            style={{ fontSize: 'var(--t-display)' }}
          >
            Styles that make you, unmistakably you.
          </h2>
          <p className="text-ash text-lg leading-relaxed mb-8">
            Before a single post goes out, we define the look and feel of your brand: the marks, the
            palette, the type, the grid, the tone. Every asset you receive lives inside one coherent
            <span className="text-ivory"> brand board</span> &mdash; a single source of truth so your
            brand looks intentional everywhere it shows up.
          </p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
            {['Logo & Marks', 'Color Systems', 'Typography Scale', 'Grid & Layout', 'Iconography', 'Tone of Voice'].map(
              (t) => (
                <li key={t} className="flex items-center gap-2 text-ash text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                  {t}
                </li>
              )
            )}
          </ul>
        </div>

        {/* Brand board mock */}
        <div
          className="gold-border rounded-sm bg-bg p-6 md:p-8 relative"
          style={{
            opacity: on ? 1 : 0,
            transform: on ? 'translateY(0) rotate(0deg)' : 'translateY(24px) rotate(-1.2deg)',
            transition: 'opacity 700ms ease, transform 700ms cubic-bezier(0.2,0.8,0.2,1)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <p className="section-label">BRAND BOARD</p>
            <p className="font-dm-mono text-[11px] text-coal">v.01</p>
          </div>

          {/* Monogram lockup */}
          <div
            className="flex items-center gap-4 mb-8"
            style={{
              opacity: on ? 1 : 0,
              transform: on ? 'none' : 'translateY(10px)',
              transition: 'all 500ms ease 200ms',
            }}
          >
            <div className="w-16 h-16 rounded-full border border-gold/50 flex items-center justify-center">
              <span className="gold-text font-cormorant font-bold text-3xl italic">L</span>
            </div>
            <div>
              <p className="font-bebas text-ivory text-2xl tracking-wider leading-none">YOUR BRAND</p>
              <p className="font-dm-mono text-[10px] text-ash tracking-[0.25em] mt-1">EST. 2026</p>
            </div>
          </div>

          {/* Color swatches — stop-motion staggered grow */}
          <div className="flex gap-2 mb-8">
            {SWATCHES.map((s, idx) => (
              <div key={s.hex} className="flex-1">
                <div
                  className="h-16 rounded-sm mb-2 origin-bottom"
                  style={{
                    backgroundColor: s.hex,
                    border: s.hex === '#E8E2D5' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    transform: on ? 'scaleY(1)' : 'scaleY(0)',
                    transition: `transform 420ms steps(4, end) ${260 + idx * 90}ms`,
                  }}
                />
                <p className="font-dm-mono text-[9px] text-ash leading-tight">{s.name}</p>
                <p className="font-dm-mono text-[9px] text-coal leading-tight">{s.hex}</p>
              </div>
            ))}
          </div>

          {/* Type specimens */}
          <div className="flex flex-col gap-3">
            {TYPES.map((t, idx) => (
              <div
                key={t.label}
                className="flex items-baseline justify-between border-t border-coal/40 pt-3"
                style={{
                  opacity: on ? 1 : 0,
                  transform: on ? 'none' : 'translateX(-8px)',
                  transition: `all 500ms ease ${700 + idx * 120}ms`,
                }}
              >
                <span className={`${t.face} text-ivory text-3xl leading-none`}>Aa</span>
                <span className="font-dm-mono text-[10px] text-ash">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
