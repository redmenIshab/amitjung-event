'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'

const SCENES = [
  {
    headline: ['WE BRING', 'EVENTS', 'TO LIFE'],
    label: 'LYANTE PRODUCTION',
    tag: 'Live Events',
    image: '/images/photo-21.jpg',
  },
  {
    headline: ['WE DOCUMENT', 'THE JOURNEY'],
    label: 'BEYOND THE MOMENT',
    tag: 'Documentary',
    image: '/images/photo-3.jpg',
  },
  {
    headline: ['YOUR STORY', 'FOREVER'],
    label: 'FOR LIFETIME MEMORY',
    tag: 'Legacy',
    image: '/images/photo-13.jpg',
  },
]

type AnimPhase = 'idle' | 'zoom-out' | 'zoom-in'

function isHeroInView() {
  const hero = document.getElementById('hero-section')
  if (!hero) return false
  const rect = hero.getBoundingClientRect()
  return rect.top <= 10 && rect.bottom >= window.innerHeight - 10
}

export default function Hero() {
  const [scene, setScene]         = useState(0)
  const [exitScene, setExitScene] = useState<number | null>(null)
  const [phase, setPhase]         = useState<AnimPhase>('idle')
  const isAnimating  = useRef(false)
  const wheelAccum   = useRef(0)
  const touchStartY  = useRef(0)
  const touchStartX  = useRef(0)
  // Always-current scene ref so handlers never stale-close
  const sceneRef = useRef(0)
  sceneRef.current = scene

  const goToScene = useCallback((next: number) => {
    if (isAnimating.current) return
    if (next < 0 || next >= SCENES.length) return
    isAnimating.current = true
    setExitScene(sceneRef.current)
    setPhase('zoom-out')

    setTimeout(() => {
      setScene(next)
      setExitScene(null)
      setPhase('zoom-in')
    }, 420)

    setTimeout(() => {
      setPhase('idle')
      isAnimating.current = false
    }, 850)
  }, [])

  // ── Wheel (desktop) ──────────────────────────────────────────────
  useEffect(() => {
    const THRESHOLD = 80

    const onWheel = (e: WheelEvent) => {
      if (!isHeroInView()) return

      const goingDown = e.deltaY > 0
      const goingUp   = e.deltaY < 0

      if (goingDown && sceneRef.current === SCENES.length - 1) { wheelAccum.current = 0; return }
      if (goingUp   && sceneRef.current === 0)                  { wheelAccum.current = 0; return }

      e.preventDefault()
      wheelAccum.current += e.deltaY

      if (Math.abs(wheelAccum.current) >= THRESHOLD) {
        const dir = wheelAccum.current > 0 ? 1 : -1
        wheelAccum.current = 0
        goToScene(sceneRef.current + dir)
      }
    }

    wheelAccum.current = 0
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [goToScene])

  // ── Touch (mobile) ───────────────────────────────────────────────
  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
      touchStartX.current = e.touches[0].clientX
    }

    const onEnd = (e: TouchEvent) => {
      if (!isHeroInView()) return

      const dY = touchStartY.current - e.changedTouches[0].clientY
      const dX = touchStartX.current - e.changedTouches[0].clientX

      // Ignore horizontal-dominant swipes (e.g. carousel inside)
      if (Math.abs(dX) > Math.abs(dY)) return
      // Ignore short taps
      if (Math.abs(dY) < 50) return

      const swipingUp   = dY > 0   // finger travelled upward → advance scene
      const swipingDown = dY < 0   // finger travelled downward → go back

      // Boundary: let the page scroll naturally at the edges
      if (swipingUp   && sceneRef.current === SCENES.length - 1) return
      if (swipingDown && sceneRef.current === 0) return

      goToScene(sceneRef.current + (dY > 0 ? 1 : -1))
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend',   onEnd,   { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend',   onEnd)
    }
  }, [goToScene])

  const current = SCENES[scene]

  return (
    <section
      id="hero-section"
      className="relative h-screen overflow-hidden flex items-center justify-center bg-bg"
    >
      {/* Background images */}
      {SCENES.map((s, i) => (
        <div
          key={s.image}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === scene ? 1 : 0 }}
        >
          <Image src={s.image} alt="" fill className="object-cover" priority={i === 0} sizes="100vw" />
        </div>
      ))}

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-bg/65 pointer-events-none z-10" />

      {/* Exiting headline */}
      {exitScene !== null && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          style={{ animation: 'heroZoomOut 0.6s cubic-bezier(0.4,0,1,1) forwards' }}
        >
          <HeadlineText lines={SCENES[exitScene].headline} />
        </div>
      )}

      {/* Current headline */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        style={{
          animation: phase === 'zoom-in' ? 'heroZoomIn 0.4s cubic-bezier(0,0,0.2,1) forwards' : undefined,
        }}
      >
        <HeadlineText lines={current.headline} />
      </div>

      {/* Top-left: scene label */}
      <div className="absolute top-20 left-4 md:top-24 md:left-20 z-30">
        <p className="section-label">{current.label}</p>
      </div>

      {/* Vertical category tag — desktop only (avoids colliding with arrow on mobile) */}
      <div
        className="hidden md:block absolute right-20 top-1/2 z-30"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(50%)' }}
      >
        <p className="font-cormorant italic text-2xl text-gold-light">{current.tag}</p>
      </div>

      {/* Mobile category tag — horizontal, below headline */}
      <div className="md:hidden absolute bottom-28 left-1/2 -translate-x-1/2 z-30">
        <p className="font-cormorant italic text-lg text-gold-light text-center">{current.tag}</p>
      </div>

      {/* Bottom-left: persistent tagline — desktop only */}
      <div className="hidden md:block absolute bottom-8 left-20 z-30">
        <p className="font-bebas text-base tracking-widest text-ivory">LYANTE PRODUCTION</p>
        <p className="text-ash text-xs mt-1">Creative Event Production · Nepal</p>
      </div>

      {/* Bottom centre: scene dots + arrow (shared on mobile, dots-only on desktop) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
        {/* Dots */}
        <div className="flex gap-2 items-center">
          {SCENES.map((_, i) => (
            <button
              key={i}
              onClick={() => goToScene(i)}
              aria-label={`Go to scene ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === scene ? 'bg-gold w-4 h-1.5' : 'bg-ash w-1.5 h-1.5'
              }`}
            />
          ))}
        </div>

        {/* Arrow — inline with dots on mobile, hidden on desktop (desktop has its own) */}
        <button
          onClick={() => {
            if (scene < SCENES.length - 1) goToScene(scene + 1)
            else document.getElementById('manifesto')?.scrollIntoView({ behavior: 'smooth' })
          }}
          className="md:hidden w-10 h-10 rounded-full border border-gold flex items-center justify-center text-gold text-sm active:bg-gold active:text-bg transition-all duration-200"
          aria-label="Next"
        >
          ↓
        </button>
      </div>

      {/* Desktop-only scroll arrow — right side */}
      <button
        onClick={() => {
          if (scene < SCENES.length - 1) goToScene(scene + 1)
          else document.getElementById('manifesto')?.scrollIntoView({ behavior: 'smooth' })
        }}
        className="hidden md:flex absolute bottom-8 right-20 z-30 w-12 h-12 rounded-full border border-gold items-center justify-center text-gold hover:bg-gold hover:text-bg transition-all duration-200 animate-pulse"
        aria-label="Scroll down"
      >
        ↓
      </button>

      <style>{`
        @keyframes heroZoomOut {
          from { transform: scale(1); opacity: 1; }
          50%  { opacity: 0.3; }
          to   { transform: scale(12); opacity: 0; }
        }
        @keyframes heroZoomIn {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </section>
  )
}

function HeadlineText({ lines }: { lines: string[] }) {
  return (
    <div className="text-center px-6">
      {lines.map((line, i) => (
        <h1
          key={i}
          className="font-cormorant font-bold text-ivory leading-none drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]"
          style={{ fontSize: 'clamp(42px, 13vw, 140px)', letterSpacing: '-0.03em' }}
        >
          {line}
        </h1>
      ))}
    </div>
  )
}
