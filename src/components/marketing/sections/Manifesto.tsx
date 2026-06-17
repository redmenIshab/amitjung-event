'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const WORDS = "We don't just cover events. We preserve them.".split(' ')
const TORCH_RADIUS = 160

export default function Manifesto() {
  const sectionRef      = useRef<HTMLDivElement>(null)
  const autoRafRef      = useRef<number | null>(null)
  const tRef            = useRef(0)                        // animation time counter
  const [scrollRevealed, setScrollRevealed] = useState(false)
  const [torch, setTorch]         = useState({ x: 0, y: 0, active: false })
  const [mouseInside, setMouseInside] = useState(false)   // real pointer is inside

  // Show hint + auto cursor whenever section is visible and mouse isn't inside
  const showHint = scrollRevealed && !mouseInside

  // ── Scroll reveal ────────────────────────────────────────────────
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setScrollRevealed(true) },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // ── Auto-moving demo cursor (Lissajous path) ─────────────────────
  // Runs whenever the real pointer is outside; pauses when inside.
  useEffect(() => {
    if (!showHint) {
      if (autoRafRef.current) cancelAnimationFrame(autoRafRef.current)
      setTorch(t => ({ ...t, active: false }))
      return
    }

    const el = sectionRef.current
    if (!el) return

    const animate = () => {
      const rect = el.getBoundingClientRect()
      tRef.current += 0.018

      // Lissajous figure — smooth organic path that covers the section
      const x = rect.width  * 0.5 + rect.width  * 0.32 * Math.sin(tRef.current * 0.9)
      const y = rect.height * 0.5 + rect.height * 0.28 * Math.sin(tRef.current * 0.6)

      setTorch({ x, y, active: true })
      autoRafRef.current = requestAnimationFrame(animate)
    }

    // Small delay so it starts after the word-reveal animation settles
    const timeout = setTimeout(() => {
      autoRafRef.current = requestAnimationFrame(animate)
    }, WORDS.length * 80 + 500)

    return () => {
      clearTimeout(timeout)
      if (autoRafRef.current) cancelAnimationFrame(autoRafRef.current)
    }
  }, [showHint])

  // ── Helpers ──────────────────────────────────────────────────────
  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  // ── Mouse handlers ───────────────────────────────────────────────
  const handleMouseEnter = useCallback(() => setMouseInside(true), [])
  const handleMouseLeave = useCallback(() => {
    setMouseInside(false)
    setTorch(t => ({ ...t, active: false }))
  }, [])
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getRelativePos(e.clientX, e.clientY)
    setTorch({ ...pos, active: true })
  }, [getRelativePos])

  // ── Touch handlers (passive: false for preventDefault) ───────────
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      setMouseInside(true)
      const touch = e.touches[0]
      setTorch({ ...getRelativePos(touch.clientX, touch.clientY), active: true })
    }
    const onTouchEnd = () => {
      setMouseInside(false)
      setTorch(t => ({ ...t, active: false }))
    }

    el.addEventListener('touchmove',   onTouchMove, { passive: false })
    el.addEventListener('touchend',    onTouchEnd,  { passive: true })
    el.addEventListener('touchcancel', onTouchEnd,  { passive: true })

    return () => {
      el.removeEventListener('touchmove',   onTouchMove)
      el.removeEventListener('touchend',    onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [getRelativePos])

  return (
    <section
      id="manifesto"
      ref={sectionRef}
      className="relative py-24 md:py-32 px-4 md:px-20 bg-surface flex items-center justify-center overflow-hidden cursor-none"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      {/* Text */}
      <p
        className="relative z-10 font-cormorant font-light italic text-ivory text-center max-w-4xl leading-tight select-none"
        style={{ fontSize: 'clamp(24px, 5vw, 64px)' }}
      >
        <span className="sr-only">{WORDS.join(' ')}</span>
        {WORDS.map((word, i) => (
          <span
            key={i}
            aria-hidden
            className="inline-block mr-[0.25em] transition-all duration-700"
            style={{
              opacity: scrollRevealed ? 1 : 0,
              transform: scrollRevealed ? 'translateY(0)' : 'translateY(12px)',
              transitionDelay: scrollRevealed ? `${i * 80}ms` : '0ms',
            }}
          >
            {word}
          </span>
        ))}
      </p>

      {/* Torch overlay */}
      <div
        aria-hidden
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: torch.active
            ? `radial-gradient(circle ${TORCH_RADIUS}px at ${torch.x}px ${torch.y}px,
                transparent 0%,
                rgba(17,17,17,0.55) 45%,
                rgba(17,17,17,0.98) 70%)`
            : 'rgba(17,17,17,0.98)',
          transition: torch.active ? 'background 0ms' : 'background 600ms ease',
        }}
      />

      {/* Cursor dot — gold glow */}
      {torch.active && (
        <div
          aria-hidden
          className="absolute z-30 pointer-events-none rounded-full"
          style={{
            width: 12,
            height: 12,
            left: torch.x - 6,
            top: torch.y - 6,
            background: 'radial-gradient(circle, #F5C842 0%, #C8922A 60%, transparent 100%)',
            boxShadow: '0 0 16px 4px rgba(245,200,66,0.35)',
            filter: 'blur(0.5px)',
          }}
        />
      )}

      {/* ── Hint — visible when pointer is outside ── */}
      <div
        aria-hidden
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none"
        style={{
          opacity: showHint ? 1 : 0,
          transform: showHint ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 500ms ease, transform 500ms ease',
        }}
      >
        {/* Desktop */}
        <div className="hidden md:flex items-center gap-2">
          <svg
            width="16" height="16" viewBox="0 0 16 16" fill="none"
            style={{ animation: 'hintCursorPulse 1.8s ease-in-out infinite' }}
          >
            <path d="M2 1.5L2 11.5L5 8.8L6.8 13L8 12.5L6.2 8H10L2 1.5Z" fill="#C8922A" />
          </svg>
          <span className="font-dm text-xs tracking-[0.2em] text-gold/70 uppercase">
            Hover to reveal
          </span>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden flex-col items-center gap-1.5">
          <svg
            width="26" height="30" viewBox="0 0 26 30" fill="none"
            style={{ animation: 'hintDragSlide 2s ease-in-out infinite' }}
          >
            {/* finger */}
            <rect x="9" y="2" width="8" height="16" rx="4" fill="#C8922A" opacity="0.9"/>
            {/* palm */}
            <rect x="4" y="14" width="18" height="12" rx="5" fill="#C8922A" opacity="0.55"/>
            {/* left trail */}
            <line x1="1" y1="10" x2="5" y2="10" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" opacity="0.45"/>
            {/* right trail */}
            <line x1="21" y1="10" x2="25" y2="10" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" opacity="0.45"/>
          </svg>
          <span className="font-dm text-xs tracking-[0.2em] text-gold/70 uppercase">
            Drag to reveal
          </span>
        </div>
      </div>

      <style>{`
        @keyframes hintCursorPulse {
          0%, 100% { opacity: 0.5; transform: translate(0, 0) scale(1); }
          40%       { opacity: 1;   transform: translate(3px, 2px) scale(1.1); }
          70%       { opacity: 0.8; transform: translate(-2px, 3px) scale(1.05); }
        }
        @keyframes hintDragSlide {
          0%, 100% { transform: translateX(0);    opacity: 0.55; }
          30%       { transform: translateX(-6px); opacity: 1; }
          70%       { transform: translateX(6px);  opacity: 1; }
        }
      `}</style>
    </section>
  )
}
