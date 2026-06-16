'use client'

import { useEffect, useRef, useState } from 'react'

// SVG icons for each phase — rendered inline above the checkpoint dot
const ICONS = [
  // 0 — PRE-EVENT: clipboard / planning
  (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="7" width="24" height="28" rx="2" />
      <path d="M15 7V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" />
      <path d="M13 16h14M13 21h14M13 26h8" />
      <circle cx="28" cy="28" r="5" fill="#1C1C1C" stroke="currentColor" />
      <path d="M26 28l1.5 1.5L30 26" strokeWidth="1.2" />
    </svg>
  ),
  // 1 — EVENT DAY: video camera / shooting
  (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="12" width="22" height="16" rx="2" />
      <path d="M26 16l10-4v16l-10-4V16z" />
      <circle cx="13" cy="20" r="3" />
      <circle cx="13" cy="20" r="1" fill="currentColor" />
      {/* Record light */}
      <circle cx="32" cy="14" r="1.5" fill="#C8922A" stroke="none" />
    </svg>
  ),
  // 2 — POST-EVENT: film reel
  (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="20" r="14" />
      <circle cx="20" cy="20" r="5" />
      {/* Sprocket holes */}
      <circle cx="20" cy="8"  r="2" />
      <circle cx="20" cy="32" r="2" />
      <circle cx="8"  cy="20" r="2" />
      <circle cx="32" cy="20" r="2" />
      <circle cx="11" cy="11" r="2" />
      <circle cx="29" cy="29" r="2" />
      <circle cx="29" cy="11" r="2" />
      <circle cx="11" cy="29" r="2" />
    </svg>
  ),
  // 3 — FOREVER: folder with archive / files
  (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14a2 2 0 0 1 2-2h10l3 3h15a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V14z" />
      <path d="M13 22h14M13 27h8" />
      {/* small doc inside */}
      <rect x="17" y="18" width="6" height="8" rx="1" strokeWidth="1" />
      <path d="M19 20h2M19 22h2" strokeWidth="1" />
    </svg>
  ),
]

const PHASES = [
  { title: 'PRE-EVENT',  items: ['Strategy', 'Buzz Building', 'Marketing', 'Hype Content'] },
  { title: 'EVENT DAY',  items: ['Live Coverage', 'Behind Scenes', 'On-set Capture', 'Candid Moments'] },
  { title: 'POST-EVENT', items: ['Editing', 'Sponsor Reels', 'Social Content', 'Highlight Film'] },
  { title: 'FOREVER',    items: ['Archive', 'Documentation', 'Lifetime Access', 'Organizer Journal'] },
]

// Each phase unlocks after this many ms from when the section enters view
const PHASE_DELAYS = [400, 900, 1400, 1900]

export default function ProcessTimeline() {
  const ref = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(-1) // -1 = nothing shown yet

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
        // Fire each phase sequentially
        PHASE_DELAYS.forEach((delay, i) => {
          setTimeout(() => setActiveIndex(i), delay)
        })
      },
      { rootMargin: '-35% 0px -35% 0px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const visible = activeIndex >= 0

  return (
    <section ref={ref} className="py-24 md:py-32 px-4 md:px-20 bg-surface-mid overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        <p className="section-label mb-3">HOW WE WORK</p>
        <h2
          className="font-cormorant font-bold text-ivory mb-16"
          style={{ fontSize: 'var(--t-display)' }}
        >
          Our Process
        </h2>

        <div className="relative">
          {/* ── Desktop horizontal line ── */}
          <div className="hidden md:block absolute top-3 left-0 right-0 h-[1px] bg-coal overflow-hidden">
            <div
              className="h-full bg-gold origin-left transition-transform duration-[1800ms] ease-out"
              style={{ transform: visible ? 'scaleX(1)' : 'scaleX(0)' }}
            />
          </div>

          {/* ── Mobile vertical line ── */}
          <div className="md:hidden absolute left-3 top-0 bottom-0 w-[1px] bg-coal overflow-hidden">
            <div
              className="w-full bg-gold origin-top transition-transform duration-[1800ms] ease-out"
              style={{ transform: visible ? 'scaleY(1)' : 'scaleY(0)' }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-8 pl-8 md:pl-0 relative">
            {PHASES.map((phase, i) => {
              const isActive = i <= activeIndex

              return (
                <div key={phase.title} className="relative">

                  {/* ── Icon — desktop: absolute above the dot ── */}
                  <div
                    className="hidden md:flex absolute items-end justify-start"
                    style={{
                      top: -84,   // sits above the dot (dot is at -34px, icon is 40px tall + 10px gap)
                      left: -4,
                      width: 40,
                      height: 40,
                      color: '#C8922A',
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.85)',
                      transition: 'opacity 600ms ease, transform 600ms ease',
                      transitionDelay: isActive ? `${i * 120}ms` : '0ms',
                      filter: isActive ? 'drop-shadow(0 0 6px rgba(200,146,42,0.5))' : 'none',
                    }}
                  >
                    {ICONS[i]}
                  </div>

                  {/* ── Dot — desktop ── */}
                  <div
                    className="hidden md:block absolute w-3 h-3 rounded-full border-2 border-surface-mid"
                    style={{
                      top: -34,
                      left: 0,
                      backgroundColor: isActive ? '#C8922A' : '#4A4744',
                      boxShadow: isActive ? '0 0 8px 2px rgba(200,146,42,0.45)' : 'none',
                      transition: 'background-color 400ms ease, box-shadow 400ms ease',
                    }}
                  />

                  {/* ── Icon — mobile: absolute left of the dot ── */}
                  <div
                    className="md:hidden absolute flex items-center justify-center"
                    style={{
                      left: -60,
                      top: -2,
                      width: 32,
                      height: 32,
                      color: '#C8922A',
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? 'translateX(0) scale(1)' : 'translateX(-8px) scale(0.85)',
                      transition: 'opacity 600ms ease, transform 600ms ease',
                      filter: isActive ? 'drop-shadow(0 0 4px rgba(200,146,42,0.5))' : 'none',
                    }}
                  >
                    {ICONS[i]}
                  </div>

                  {/* ── Dot — mobile ── */}
                  <div
                    className="md:hidden absolute w-3 h-3 rounded-full border-2 border-surface-mid"
                    style={{
                      left: -22,
                      top: 4,
                      backgroundColor: isActive ? '#C8922A' : '#4A4744',
                      boxShadow: isActive ? '0 0 8px 2px rgba(200,146,42,0.45)' : 'none',
                      transition: 'background-color 400ms ease, box-shadow 400ms ease',
                    }}
                  />

                  {/* ── Phase content ── */}
                  <div
                    style={{
                      opacity: isActive ? 1 : 0,
                      transform: isActive ? 'translateY(0)' : 'translateY(14px)',
                      transition: 'opacity 500ms ease, transform 500ms ease',
                      transitionDelay: isActive ? '80ms' : '0ms',
                    }}
                  >
                    <p className="font-bebas text-2xl tracking-wider text-ivory mb-4">
                      {phase.title}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {phase.items.map((item) => (
                        <li key={item} className="text-ash text-sm">{item}</li>
                      ))}
                    </ul>
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
