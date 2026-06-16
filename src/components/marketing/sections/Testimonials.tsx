'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const TESTIMONIALS = [
  {
    quote:
      "Nepal Music Festival has worked with many production teams over the years, but Lyante is on a different level. They understood the soul of the festival before we even finished briefing them. Every frame they delivered felt like it was made for the stage.",
    name: 'Ranjan Ojha',
    role: 'Founder',
    event: 'Nepal Music Festival',
  },
  {
    quote:
      "The Amit Jung & Gorkhey concert in Itahari was a massive undertaking and Lyante handled it like seasoned professionals. The crowd was electric, and their team captured every single moment — the tears, the energy, the chaos — all of it. The final film gave me goosebumps.",
    name: 'Prawesh Limbu',
    role: 'Organizer',
    event: 'Amit Jung & Gorkhey Concert, Itahari',
  },
  {
    quote:
      "I have done many concerts in Itahari and I have tried different teams. Nothing comes close to what Lyante delivers. They show up prepared, they stay until the last light goes off, and what they produce after is something you want to show people for years. I will not do another show without them.",
    name: 'Khagen Magar',
    role: 'Serial Concert Organizer',
    event: 'Itahari',
  },
]

const INTERVAL = 5000 // ms per slide

export default function Testimonials() {
  const sectionRef                  = useRef<HTMLDivElement>(null)
  const timerRef                    = useRef<ReturnType<typeof setInterval> | null>(null)
  const [active, setActive]         = useState(0)
  const [visible, setVisible]       = useState(false)
  const [progress, setProgress]     = useState(0)
  const [textIn, setTextIn]         = useState(true)
  const progressStart               = useRef<number | null>(null)
  const rafRef                      = useRef<number | null>(null)

  // Scroll-triggered reveal
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { rootMargin: '-20% 0px -20% 0px', threshold: 0 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const goTo = useCallback((next: number) => {
    setTextIn(false)
    setTimeout(() => {
      setActive(next)
      setTextIn(true)
      setProgress(0)
      progressStart.current = null
    }, 350)
  }, [])

  // Progress bar RAF loop
  useEffect(() => {
    if (!visible) return

    const tick = (ts: number) => {
      if (progressStart.current === null) progressStart.current = ts
      const elapsed = ts - progressStart.current
      const pct = Math.min((elapsed / INTERVAL) * 100, 100)
      setProgress(pct)
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active, visible])

  // Auto-advance
  useEffect(() => {
    if (!visible) return
    timerRef.current = setInterval(() => {
      goTo((active + 1) % TESTIMONIALS.length)
    }, INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [visible, active, goTo])

  const t = TESTIMONIALS[active]

  return (
    <section
      ref={sectionRef}
      className="relative py-28 md:py-40 px-4 md:px-20 bg-lyante-bg overflow-hidden"
    >
      {/* Decorative background word */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-cormorant font-bold text-ivory select-none pointer-events-none"
        style={{ fontSize: 'clamp(160px, 30vw, 380px)', opacity: 0.03, letterSpacing: '-0.05em', whiteSpace: 'nowrap' }}
      >
        WORDS
      </span>

      <div
        className="max-w-[1000px] mx-auto flex flex-col items-center text-center"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(32px)',
          transition: 'opacity 800ms ease, transform 800ms ease',
        }}
      >
        {/* Section label */}
        <p className="section-label mb-12">WHAT CLIENTS SAY</p>

        {/* Gold opening mark */}
        <span
          aria-hidden
          className="font-cormorant text-gold leading-none select-none mb-2"
          style={{ fontSize: 'clamp(64px, 10vw, 100px)', opacity: 0.6, lineHeight: 0.8 }}
        >
          &ldquo;
        </span>

        {/* Quote */}
        <blockquote
          style={{
            opacity: textIn ? 1 : 0,
            transform: textIn ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 350ms ease, transform 350ms ease',
          }}
        >
          <p
            className="font-cormorant font-light italic text-ivory leading-snug"
            style={{ fontSize: 'clamp(22px, 3.2vw, 42px)' }}
          >
            {t.quote}
          </p>
        </blockquote>

        {/* Attribution */}
        <div
          className="mt-10 flex flex-col items-center gap-1"
          style={{
            opacity: textIn ? 1 : 0,
            transition: 'opacity 350ms ease 80ms',
          }}
        >
          <div className="w-8 h-[1px] bg-gold mb-4" />
          <p className="font-bebas tracking-widest text-ivory text-lg">{t.name}</p>
          <p className="text-ash text-xs tracking-wide">{t.role} · {t.event}</p>
        </div>

        {/* Progress + dot navigation */}
        <div className="mt-14 flex items-center gap-5">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => { if (timerRef.current) clearInterval(timerRef.current); goTo(i) }}
              aria-label={`Testimonial ${i + 1}`}
              className="relative flex items-center justify-center"
            >
              {i === active ? (
                /* Active — gold progress ring */
                <svg width="28" height="28" viewBox="0 0 28 28" className="rotate-[-90deg]">
                  <circle cx="14" cy="14" r="11" fill="none" stroke="#2a2826" strokeWidth="1.5" />
                  <circle
                    cx="14" cy="14" r="11"
                    fill="none"
                    stroke="#C8922A"
                    strokeWidth="1.5"
                    strokeDasharray={`${2 * Math.PI * 11}`}
                    strokeDashoffset={`${2 * Math.PI * 11 * (1 - progress / 100)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 100ms linear' }}
                  />
                  <circle cx="14" cy="14" r="4" fill="#C8922A" />
                </svg>
              ) : (
                <span
                  className="block rounded-full transition-all duration-300"
                  style={{ width: 6, height: 6, background: '#4A4744' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
