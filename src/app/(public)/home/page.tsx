'use client'

import { useEffect, useRef, useState, useCallback, FormEvent, ReactNode } from 'react'
import Image from 'next/image'

// ─── ServiceCard ─────────────────────────────────────────────────────

interface ServiceCardProps {
  number: string
  label: string
  title: string
  body: string
  icon: ReactNode
  href?: string
}

function ServiceCard({ number, label, title, body, icon, href = '#contact' }: ServiceCardProps) {
  return (
    <div className="gold-border rounded-sm p-6 bg-surface flex flex-col gap-4 min-w-[280px] md:min-w-0 transition-all duration-200 hover:-translate-y-1 hover:bg-surface-mid group">
      <div className="text-gold w-8 h-8">{icon}</div>
      <div>
        <p className="section-label mb-2">{number} — {label}</p>
        <h3 className="font-dm font-bold text-ivory text-2xl leading-tight mb-3">{title}</h3>
        <p className="text-ash text-sm leading-relaxed">{body}</p>
      </div>
      <a href={href} className="text-gold text-sm underline underline-offset-4 hover:text-gold-light transition-colors mt-auto">
        Learn more →
      </a>
    </div>
  )
}

// ─── Button ──────────────────────────────────────────────────────────

interface ButtonProps {
  children: ReactNode
  href?: string
  onClick?: () => void
  variant?: 'gold' | 'outline'
  className?: string
  type?: 'button' | 'submit'
}

function Button({
  children,
  href,
  onClick,
  variant = 'outline',
  className = '',
  type = 'button',
}: ButtonProps) {
  const base =
    'inline-flex items-center gap-2 px-6 py-3 font-bebas text-sm tracking-widest uppercase transition-all duration-250 min-h-[48px]'
  const styles = {
    outline: 'border border-gold text-gold hover:bg-gold hover:text-bg',
    gold: 'bg-gold text-bg hover:opacity-90',
  }
  const cls = `${base} ${styles[variant]} ${className}`

  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  )
}

// ─── Navigation ──────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'HOME', href: '#hero-section', track: true },
  { label: 'EVENTS', href: '/events', track: false },
  { label: 'WORK', href: '#work', track: true },
  { label: 'SERVICES', href: '#services', track: true },
  { label: 'TICKETING', href: '#ticketing', track: true },
  { label: 'CONTACT', href: '#contact', track: true },
]

const TRACKABLE_IDS = NAV_LINKS.filter(l => l.track).map(l => l.href.slice(1))

function Navigation() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('hero-section')

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 80)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  useEffect(() => {
    const els = TRACKABLE_IDS.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (!els.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible.length) {
          setActiveSection(visible[0].target.id)
        }
      },
      { rootMargin: '-30% 0px -30% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    )

    els.forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-20 h-16 md:h-20 transition-all duration-300 ${
          scrolled
            ? 'bg-[rgba(8,8,8,0.92)] backdrop-blur-[12px]'
            : 'bg-transparent'
        }`}
      >
        <a href="#hero-section" className="flex items-center gap-2" aria-label="Lyante Production home">
          <span className="font-bebas text-xl tracking-widest text-gold">LYANTE</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const isActive = link.track && activeSection === link.href.slice(1)
            return (
              <a
                key={link.href}
                href={link.href}
                className={`font-bebas text-sm tracking-widest transition-colors duration-200 ${
                  isActive ? 'text-gold' : 'text-ash hover:text-gold-light'
                }`}
              >
                {link.label}
              </a>
            )
          })}
          <a
            href="/auth/login"
            className="inline-flex items-center gap-2 px-5 py-2 font-bebas text-sm tracking-widest uppercase border border-gold text-gold hover:bg-gold hover:text-bg transition-all duration-250 min-h-[40px] ml-4"
          >
            LOGIN
          </a>
        </div>

        <button
          className="md:hidden flex flex-col gap-[5px] w-12 h-12 items-center justify-center"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <span className={`block w-6 h-[1.5px] bg-gold transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[6.5px]' : ''}`} />
          <span className={`block w-6 h-[1.5px] bg-gold transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
          <span className={`block w-6 h-[1.5px] bg-gold transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[6.5px]' : ''}`} />
        </button>
      </nav>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8"
          style={{ backgroundColor: 'rgba(8, 8, 8, 0.6)', backdropFilter: 'blur(8px)' }}
        >
          {NAV_LINKS.map((link) => {
            const isActive = link.track && activeSection === link.href.slice(1)
            return (
              <a
                key={link.href}
                href={link.href}
                className={`font-bebas text-4xl tracking-widest transition-colors ${
                  isActive ? 'text-gold' : 'text-ivory hover:text-gold'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            )
          })}
          <a
            href="/auth/login"
            className="inline-flex items-center gap-2 px-6 py-3 font-bebas text-sm tracking-widest uppercase bg-gold text-bg hover:opacity-90 transition-all duration-250 min-h-[48px] mt-4"
            onClick={() => setMenuOpen(false)}
          >
            LOGIN
          </a>
        </div>
      )}
    </>
  )
}

// ─── Hero ────────────────────────────────────────────────────────────

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

function Hero() {
  const [scene, setScene]         = useState(0)
  const [exitScene, setExitScene] = useState<number | null>(null)
  const [phase, setPhase]         = useState<AnimPhase>('idle')
  const isAnimating  = useRef(false)
  const wheelAccum   = useRef(0)
  const touchStartY  = useRef(0)
  const touchStartX  = useRef(0)
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

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY
      touchStartX.current = e.touches[0].clientX
    }

    const onEnd = (e: TouchEvent) => {
      if (!isHeroInView()) return

      const dY = touchStartY.current - e.changedTouches[0].clientY
      const dX = touchStartX.current - e.changedTouches[0].clientX

      if (Math.abs(dX) > Math.abs(dY)) return
      if (Math.abs(dY) < 50) return

      const swipingUp   = dY > 0
      const swipingDown = dY < 0

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
      {SCENES.map((s, i) => (
        <div
          key={s.image}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === scene ? 1 : 0 }}
        >
          <img src={s.image} alt="" className="object-cover w-full h-full" />
        </div>
      ))}

      <div className="absolute inset-0 bg-bg/65 pointer-events-none z-10" />

      {exitScene !== null && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          style={{ animation: 'heroZoomOut 0.6s cubic-bezier(0.4,0,1,1) forwards' }}
        >
          <HeadlineText lines={SCENES[exitScene].headline} />
        </div>
      )}

      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
        style={{
          animation: phase === 'zoom-in' ? 'heroZoomIn 0.4s cubic-bezier(0,0,0.2,1) forwards' : undefined,
        }}
      >
        <HeadlineText lines={current.headline} />
      </div>

      <div className="absolute top-20 left-4 md:top-24 md:left-20 z-30">
        <p className="section-label">{current.label}</p>
      </div>

      <div
        className="hidden md:block absolute right-20 top-1/2 z-30"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg) translateY(50%)' }}
      >
        <p className="font-cormorant italic text-2xl text-gold-light">{current.tag}</p>
      </div>

      <div className="md:hidden absolute bottom-28 left-1/2 -translate-x-1/2 z-30">
        <p className="font-cormorant italic text-lg text-gold-light text-center">{current.tag}</p>
      </div>

      <div className="hidden md:block absolute bottom-8 left-20 z-30">
        <p className="font-bebas text-base tracking-widest text-ivory">LYANTE PRODUCTION</p>
        <p className="text-ash text-xs mt-1">Creative Event Production · Nepal</p>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
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

// ─── Manifesto ───────────────────────────────────────────────────────

const WORDS = "We don't just cover events. We preserve them.".split(' ')
const TORCH_RADIUS = 160

function Manifesto() {
  const sectionRef      = useRef<HTMLDivElement>(null)
  const autoRafRef      = useRef<number | null>(null)
  const tRef            = useRef(0)
  const [scrollRevealed, setScrollRevealed] = useState(false)
  const [torch, setTorch]         = useState({ x: 0, y: 0, active: false })
  const [mouseInside, setMouseInside] = useState(false)

  const showHint = scrollRevealed && !mouseInside

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

      const x = rect.width  * 0.5 + rect.width  * 0.32 * Math.sin(tRef.current * 0.9)
      const y = rect.height * 0.5 + rect.height * 0.28 * Math.sin(tRef.current * 0.6)

      setTorch({ x, y, active: true })
      autoRafRef.current = requestAnimationFrame(animate)
    }

    const timeout = setTimeout(() => {
      autoRafRef.current = requestAnimationFrame(animate)
    }, WORDS.length * 80 + 500)

    return () => {
      clearTimeout(timeout)
      if (autoRafRef.current) cancelAnimationFrame(autoRafRef.current)
    }
  }, [showHint])

  const getRelativePos = useCallback((clientX: number, clientY: number) => {
    const rect = sectionRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const handleMouseEnter = useCallback(() => setMouseInside(true), [])
  const handleMouseLeave = useCallback(() => {
    setMouseInside(false)
    setTorch(t => ({ ...t, active: false }))
  }, [])
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getRelativePos(e.clientX, e.clientY)
    setTorch({ ...pos, active: true })
  }, [getRelativePos])

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

      <div
        aria-hidden
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 pointer-events-none"
        style={{
          opacity: showHint ? 1 : 0,
          transform: showHint ? 'translateY(0)' : 'translateY(4px)',
          transition: 'opacity 500ms ease, transform 500ms ease',
        }}
      >
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

        <div className="flex md:hidden flex-col items-center gap-1.5">
          <svg
            width="26" height="30" viewBox="0 0 26 30" fill="none"
            style={{ animation: 'hintDragSlide 2s ease-in-out infinite' }}
          >
            <rect x="9" y="2" width="8" height="16" rx="4" fill="#C8922A" opacity="0.9"/>
            <rect x="4" y="14" width="18" height="12" rx="5" fill="#C8922A" opacity="0.55"/>
            <line x1="1" y1="10" x2="5" y2="10" stroke="#C8922A" strokeWidth="1.5" strokeLinecap="round" opacity="0.45"/>
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

// ─── Services ────────────────────────────────────────────────────────

const SERVICES = [
  {
    number: '01', label: 'PRE-PRODUCTION', title: 'Pre-Production',
    body: 'Strategy, storytelling, and buzz building before day one.',
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="8" width="20" height="16" rx="1" /><path d="M4 12h20M14 8v4" /><circle cx="25" cy="9" r="3" /><path d="M23.5 9l1 1 2-2" strokeWidth="1.2" /></svg>,
  },
  {
    number: '02', label: 'EVENT DAY', title: 'Event Day Coverage',
    body: 'Behind the scenes, on-set, capturing every raw moment.',
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="16" cy="16" r="10" /><circle cx="16" cy="16" r="5" /><circle cx="16" cy="16" r="2" fill="currentColor" /></svg>,
  },
  {
    number: '03', label: 'POST-PRODUCTION', title: 'Post-Production',
    body: 'Cinematic edits, sponsor coverage, and highlight reels.',
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="10" width="24" height="14" rx="1" /><path d="M10 10V6M22 10V6M4 16h24" /><circle cx="16" cy="20" r="2" /></svg>,
  },
  {
    number: '04', label: 'DOCUMENTATION', title: 'Lifetime Documentation',
    body: 'A full journey journal for organizers, preserved forever.',
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="6" y="4" width="20" height="24" rx="1" /><path d="M10 10h12M10 15h12M10 20h8" /></svg>,
  },
  {
    number: '05', label: 'TICKETING', title: 'Smart Ticketing',
    body: 'Unique one-time QR codes, digital payment, zero duplicates.',
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="4" width="10" height="10" rx="1" /><rect x="18" y="4" width="10" height="10" rx="1" /><rect x="4" y="18" width="10" height="10" rx="1" /><path d="M18 18h4v4h-4zM22 22h4v4h-4z" /></svg>,
  },
  {
    number: '06', label: 'BRANDING', title: 'Creative & Branding',
    body: 'Business branding, content creation, and marketing partnerships.',
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 4l3 9h9l-7 5 3 9-8-6-8 6 3-9-7-5h9z" /></svg>,
  },
]

function Services() {
  return (
    <section className="py-24 md:py-32 px-4 md:px-20 bg-bg" id="services">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-12">
          <p className="section-label mb-3">WHAT WE DO</p>
          <h2 className="font-cormorant font-bold text-ivory" style={{ fontSize: 'var(--t-display)' }}>
            Our Services
          </h2>
        </div>
        <div
          className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none pb-4 md:pb-0"
        >
          {SERVICES.map((s) => (
            <div key={s.number} className="snap-start shrink-0 w-[85vw] md:w-auto">
              <ServiceCard {...s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── ProcessTimeline ─────────────────────────────────────────────────

const ICONS = [
  (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="7" width="24" height="28" rx="2" />
      <path d="M15 7V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2" />
      <path d="M13 16h14M13 21h14M13 26h8" />
      <circle cx="28" cy="28" r="5" fill="#1C1C1C" stroke="currentColor" />
      <path d="M26 28l1.5 1.5L30 26" strokeWidth="1.2" />
    </svg>
  ),
  (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="12" width="22" height="16" rx="2" />
      <path d="M26 16l10-4v16l-10-4V16z" />
      <circle cx="13" cy="20" r="3" />
      <circle cx="13" cy="20" r="1" fill="currentColor" />
      <circle cx="32" cy="14" r="1.5" fill="#C8922A" stroke="none" />
    </svg>
  ),
  (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="20" cy="20" r="14" />
      <circle cx="20" cy="20" r="5" />
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
  (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 14a2 2 0 0 1 2-2h10l3 3h15a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V14z" />
      <path d="M13 22h14M13 27h8" />
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

const PHASE_DELAYS = [400, 900, 1400, 1900]

function ProcessTimeline() {
  const ref = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        observer.disconnect()
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
          <div className="hidden md:block absolute top-3 left-0 right-0 h-[1px] bg-coal overflow-hidden">
            <div
              className="h-full bg-gold origin-left transition-transform duration-[1800ms] ease-out"
              style={{ transform: visible ? 'scaleX(1)' : 'scaleX(0)' }}
            />
          </div>

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

                  <div
                    className="hidden md:flex absolute items-end justify-start"
                    style={{
                      top: -84,
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

// ─── TicketingCallout ────────────────────────────────────────────────

const TICKETING_FEATURES = [
  'Unique one-time QR per ticket',
  'Digital payment (eSewa, Khalti)',
  'Real-time camera scanning',
  'Anti-duplication server validation',
  'Lowest cost in market',
]

function TicketingCallout() {
  return (
    <section className="py-24 md:py-32 px-4 md:px-20 bg-[#141414]" id="ticketing">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="font-bebas text-gold tracking-widest text-lg mb-4">SMART TICKETING</p>
            <h2
              className="font-cormorant font-bold text-ivory mb-8 leading-tight"
              style={{ fontSize: 'var(--t-display)' }}
            >
              Zero hassle.<br />Zero fakes.
            </h2>
            <ul className="flex flex-col gap-3 mb-10">
              {TICKETING_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 font-mono text-xs text-ash">
                  <span className="text-gold mt-0.5 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Button href="/dashboard" variant="gold">GET A DEMO →</Button>
          </div>

          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48 md:w-64 md:h-64">
              <div className="w-full h-full border border-gold/40 rounded-sm p-3 bg-surface grid grid-cols-8 grid-rows-8 gap-[2px]">
                {Array.from({ length: 64 }, (_, i) => (
                  <div
                    key={i}
                    className={`rounded-[1px] ${
                      [0,1,8,9,14,15,16,17,22,23,48,49,56,57,62,63,6,7,13,55].includes(i)
                        ? 'bg-gold/80'
                        : i % 3 === 0 ? 'bg-ash/30' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
              <div className="absolute inset-x-2 top-2 bottom-2 overflow-hidden rounded-sm pointer-events-none">
                <div
                  className="absolute left-0 right-0 h-[2px] bg-gold/70"
                  style={{
                    boxShadow: '0 0 8px rgba(200,146,42,0.8)',
                    animation: 'scanDown 3s linear infinite',
                  }}
                />
              </div>
              <div
                className="absolute inset-0 flex items-center justify-center bg-bg/80 rounded-sm"
                style={{ animation: 'showVerified 3s linear infinite' }}
              >
                <div className="text-center">
                  <p className="text-green-400 text-3xl mb-1">✓</p>
                  <p className="font-mono text-xs text-green-400 tracking-widest">VERIFIED</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scanDown {
          0% { top: 0; opacity: 1; }
          80% { top: calc(100% - 2px); opacity: 1; }
          90% { opacity: 0; }
          100% { top: calc(100% - 2px); opacity: 0; }
        }
        @keyframes showVerified {
          0%, 75% { opacity: 0; }
          82%, 94% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </section>
  )
}

// ─── Portfolio ───────────────────────────────────────────────────────

const FILTERS = ['ALL', 'CONCERTS', 'CREATIVE'] as const
type Filter = typeof FILTERS[number]

const PORTFOLIO_ITEMS: { id: number; category: Exclude<Filter, 'ALL'>; title: string; image: string; tall: boolean }[] = [
  { id: 2,  category: 'CREATIVE',  title: 'Xtreme Action Shot',    image: '/images/photo-2.jpg',  tall: true  },
  { id: 3,  category: 'CREATIVE',  title: 'Xtreme Action Shot',   image: '/images/photo-4.jpg',  tall: false },
  { id: 4,  category: 'CREATIVE',  title: 'Xtreme Action Shot',         image: '/images/photo-5.jpg',  tall: true  },
  { id: 5,  category: 'CREATIVE',  title: 'Xtreme Action Shot',image: '/images/photo-6.jpg',  tall: false },
  { id: 6,  category: 'CREATIVE',  title: 'Xtreme Action Shot',       image: '/images/photo-7.jpg',  tall: true  },
  { id: 7,  category: 'CREATIVE',  title: 'Xtreme Action Shot',    image: '/images/photo-8.jpg',  tall: false },
  { id: 8,  category: 'CREATIVE',  title: 'Xtreme Action Shot',        image: '/images/photo-9.jpg',  tall: true  },
  { id: 9,  category: 'CREATIVE',  title: 'Xtreme Action Shot',       image: '/images/photo-10.jpg', tall: false },
  { id: 10, category: 'CONCERTS',  title: 'Amit Jung & Gorkhey',  image: '/images/photo-11.jpg', tall: false },
  { id: 11, category: 'CREATIVE',  title: 'Xtreme Action Shot',        image: '/images/photo-12.jpg', tall: true  },
  { id: 12, category: 'CREATIVE',  title: 'Xtreme Action Shot',     image: '/images/photo-14.jpg', tall: false },
]

function Portfolio() {
  const [active, setActive] = useState<Filter>('ALL')
  const filtered = active === 'ALL' ? PORTFOLIO_ITEMS : PORTFOLIO_ITEMS.filter((i) => i.category === active)

  return (
    <section className="py-24 md:py-32 px-4 md:px-20 bg-bg" id="work">
      <div className="max-w-[1400px] mx-auto">
        <p className="section-label mb-3">OUR WORK</p>
        <h2 className="font-cormorant font-bold text-ivory mb-10" style={{ fontSize: 'var(--t-display)' }}>
          Portfolio
        </h2>

        <div className="relative w-full h-64 md:h-96 bg-surface mb-10 rounded-sm overflow-hidden group">
          <video
            src="/video/showreel.mov"
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-bg/30 group-hover:bg-bg/10 transition-all duration-300" />
          <div className="absolute bottom-4 left-4">
            <p className="section-label">SHOWREEL</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap mb-10">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`font-bebas text-sm tracking-widest px-4 py-2 min-h-[48px] border transition-all duration-200 ${
                active === f
                  ? 'border-gold bg-gold text-bg'
                  : 'border-coal text-ash hover:border-gold hover:text-gold'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="columns-1 md:columns-3 gap-4 space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`relative ${item.tall ? 'h-72' : 'h-48'} rounded-sm overflow-hidden group break-inside-avoid`}
            >
              <img
                src={item.image}
                alt={item.title}
                className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-bg/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2 p-4">
                <p className="font-cormorant italic text-gold text-xl text-center">{item.title}</p>
                <p className="section-label">{item.category}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ────────────────────────────────────────────────────

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

const TESTIMONIAL_INTERVAL = 5000

function Testimonials() {
  const sectionRef                  = useRef<HTMLDivElement>(null)
  const timerRef                    = useRef<ReturnType<typeof setInterval> | null>(null)
  const [active, setActive]         = useState(0)
  const [visible, setVisible]       = useState(false)
  const [progress, setProgress]     = useState(0)
  const [textIn, setTextIn]         = useState(true)
  const progressStart               = useRef<number | null>(null)
  const rafRef                      = useRef<number | null>(null)

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

  useEffect(() => {
    if (!visible) return

    const tick = (ts: number) => {
      if (progressStart.current === null) progressStart.current = ts
      const elapsed = ts - progressStart.current
      const pct = Math.min((elapsed / TESTIMONIAL_INTERVAL) * 100, 100)
      setProgress(pct)
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [active, visible])

  useEffect(() => {
    if (!visible) return
    timerRef.current = setInterval(() => {
      goTo((active + 1) % TESTIMONIALS.length)
    }, TESTIMONIAL_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [visible, active, goTo])

  const t = TESTIMONIALS[active]

  return (
    <section
      ref={sectionRef}
      className="relative py-28 md:py-40 px-4 md:px-20 bg-lyante-bg overflow-hidden"
    >
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
        <p className="section-label mb-12">WHAT CLIENTS SAY</p>

        <span
          aria-hidden
          className="font-cormorant text-gold leading-none select-none mb-2"
          style={{ fontSize: 'clamp(64px, 10vw, 100px)', opacity: 0.6, lineHeight: 0.8 }}
        >
          &ldquo;
        </span>

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

        <div className="mt-14 flex items-center gap-5">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              onClick={() => { if (timerRef.current) clearInterval(timerRef.current); goTo(i) }}
              aria-label={`Testimonial ${i + 1}`}
              className="relative flex items-center justify-center"
            >
              {i === active ? (
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

// ─── Contact ─────────────────────────────────────────────────────────

const CONTACT_SERVICES = ['Production', 'Ticketing', 'Branding', 'All of the above']

function Contact() {
  const [services, setServices] = useState<string[]>([])

  const toggle = (s: string) =>
    setServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const subject = encodeURIComponent(`Brief: ${data.get('event-name') || 'New Event'}`)
    const body = encodeURIComponent(
      `Event: ${data.get('event-name')}\nDate: ${data.get('event-date')}\nServices: ${services.join(', ')}\n\n${data.get('message')}`
    )
    window.location.href = `mailto:lyanteprod@gmail.com?subject=${subject}&body=${body}`
  }

  const inputCls =
    'w-full bg-transparent border-0 border-b border-gold/40 focus:border-gold focus:outline-none text-ivory py-3 text-sm font-dm placeholder:text-coal transition-colors duration-200'

  return (
    <section className="py-24 md:py-32 px-4 md:px-20 bg-bg" id="contact">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-3 gap-16 items-start">
          <div className="md:col-span-1">
            <h2
              className="font-cormorant font-bold gold-text leading-tight"
              style={{ fontSize: 'var(--t-display)' }}
            >
              Let&apos;s create something unforgettable.
            </h2>
            <p className="text-ash text-sm mt-6 leading-relaxed">
              Tell us about your event and we&apos;ll get back to you within 24 hours.
            </p>

            <div className="mt-10 flex flex-col gap-4">
              <a
                href="mailto:lyanteprod@gmail.com"
                className="flex items-center gap-3 text-ash hover:text-gold transition-colors text-sm group"
              >
                <span className="w-8 h-8 rounded-full border border-coal group-hover:border-gold flex items-center justify-center transition-colors">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
                    <rect x="2" y="4" width="16" height="12" rx="2" />
                    <path d="M2 7l8 5 8-5" />
                  </svg>
                </span>
                lyanteprod@gmail.com
              </a>
              <a
                href="https://www.instagram.com/lyanteprod/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-ash hover:text-gold transition-colors text-sm group"
              >
                <span className="w-8 h-8 rounded-full border border-coal group-hover:border-gold flex items-center justify-center transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                @lyanteprod
              </a>
              <a
                href="https://www.tiktok.com/@lyanteprod"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-ash hover:text-gold transition-colors text-sm group"
              >
                <span className="w-8 h-8 rounded-full border border-coal group-hover:border-gold flex items-center justify-center transition-colors">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.93a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1-.31z" />
                  </svg>
                </span>
                @lyanteprod
              </a>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="md:col-span-2 flex flex-col gap-8">
            <div>
              <label htmlFor="event-name" className="section-label block mb-2">Event Name</label>
              <input
                id="event-name"
                name="event-name"
                type="text"
                required
                placeholder="e.g. Annual Gala 2025"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="event-date" className="section-label block mb-2">Event Date</label>
              <input id="event-date" name="event-date" type="date" className={inputCls} />
            </div>

            <fieldset>
              <legend className="section-label mb-4">Service Needed</legend>
              <div className="flex flex-wrap gap-3">
                {CONTACT_SERVICES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(s)}
                    className={`px-4 py-2 text-sm font-dm border transition-all duration-200 min-h-[48px] ${
                      services.includes(s)
                        ? 'border-gold bg-gold text-bg'
                        : 'border-coal text-ash hover:border-gold hover:text-gold'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="message" className="section-label block mb-2">Tell Us More</label>
              <textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Describe your event, vision, and any specific requirements..."
                className={`${inputCls} resize-none`}
              />
            </div>

            <Button type="submit" variant="gold" className="self-start">
              SEND YOUR BRIEF →
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}

// ─── Default Export ──────────────────────────────────────────────────

export default function Home() {
  return (
    <>
      <Navigation />
      <Hero />
      <Manifesto />
      <Services />
      <ProcessTimeline />
      <TicketingCallout />
      <Portfolio />
      <Testimonials />
      <Contact />
    </>
  )
}
