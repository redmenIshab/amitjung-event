'use client'

import { useEffect, useRef, useState } from 'react'

const PHASES = [
  { k: '01', title: 'DISCOVER', body: 'Audit, positioning and USP. We learn your business like owners, not vendors.' },
  { k: '02', title: 'DESIGN',   body: 'Identity, color, type and brand board. The system your brand will live inside.' },
  { k: '03', title: 'DEPLOY',   body: 'Website, social profiles and Google presence — launched and search-ready.' },
  { k: '04', title: 'AMPLIFY',  body: 'Content, paid ads and hype — a sustainable engine that keeps compounding.' },
]

const DELAYS = [300, 750, 1200, 1650]

export default function BrandBuildPhases() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(-1)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return
        io.disconnect()
        DELAYS.forEach((d, i) => setTimeout(() => setActive(i), d))
      },
      { rootMargin: '-30% 0px -30% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const visible = active >= 0

  return (
    <section ref={ref} className="py-24 md:py-32 px-4 md:px-20 bg-surface-mid overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        <p className="section-label mb-3">FROM BLANK TO BRAND</p>
        <h2
          className="font-cormorant font-bold text-ivory mb-16 leading-tight"
          style={{ fontSize: 'var(--t-display)' }}
        >
          How we build you.
        </h2>

        <div className="relative">
          {/* Progress line — desktop */}
          <div className="hidden md:block absolute top-3 left-0 right-0 h-[1px] bg-coal overflow-hidden">
            <div
              className="h-full bg-gold origin-left transition-transform duration-[1700ms] ease-out"
              style={{ transform: visible ? 'scaleX(1)' : 'scaleX(0)' }}
            />
          </div>
          {/* Progress line — mobile */}
          <div className="md:hidden absolute left-3 top-0 bottom-0 w-[1px] bg-coal overflow-hidden">
            <div
              className="w-full bg-gold origin-top transition-transform duration-[1700ms] ease-out"
              style={{ transform: visible ? 'scaleY(1)' : 'scaleY(0)' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-8 pl-8 md:pl-0 relative">
            {PHASES.map((p, i) => {
              const isActive = i <= active
              return (
                <div key={p.k} className="relative">
                  {/* dot */}
                  <div
                    className="absolute w-3 h-3 rounded-full border-2 border-surface-mid md:top-[-34px] md:left-0 left-[-22px] top-1"
                    style={{
                      backgroundColor: isActive ? '#C8922A' : '#4A4744',
                      boxShadow: isActive ? '0 0 8px 2px rgba(200,146,42,0.45)' : 'none',
                      transition: 'background-color 400ms ease, box-shadow 400ms ease',
                    }}
                  />
                  <div
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? 'translateY(0)' : 'translateY(14px)',
                      transition: 'opacity 500ms ease, transform 500ms ease',
                    }}
                  >
                    <p className="font-dm-mono text-xs text-gold mb-3">{p.k}</p>
                    <p className="font-bebas text-3xl tracking-wider text-ivory mb-3">{p.title}</p>
                    <p className="text-ash text-sm leading-relaxed">{p.body}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
