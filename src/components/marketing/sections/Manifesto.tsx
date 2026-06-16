'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

const WORDS = "We don't just cover events. We preserve them.".split(' ')
const TORCH_RADIUS = 160 // px — size of the revealed circle

export default function Manifesto() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [scrollRevealed, setScrollRevealed] = useState(false)
  const [torch, setTorch] = useState({ x: 0, y: 0, active: false })

  // Scroll-in word reveal
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

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  // Mouse handlers — attached via JSX props (fine, no preventDefault needed)
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getRelativePos(e.clientX, e.clientY)
    setTorch({ ...pos, active: true })
  }, [getRelativePos])

  const handleMouseLeave = useCallback(() => {
    setTorch(t => ({ ...t, active: false }))
  }, [])

  // Touch handlers — attached manually with passive: false so preventDefault works
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault() // prevents page scroll while torching — needs passive: false
      const touch = e.touches[0]
      const pos = getRelativePos(touch.clientX, touch.clientY)
      setTorch({ ...pos, active: true })
    }

    const onTouchEnd = () => {
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
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Text — always rendered; visible beneath the torch overlay */}
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

      {/* Torch overlay — dark mask with a radial cutout that follows the cursor/touch */}
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

      {/* Custom torch cursor — gold glow dot */}
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
    </section>
  )
}
