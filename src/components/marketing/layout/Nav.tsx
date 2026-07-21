'use client'

import { useEffect, useState, useCallback } from 'react'

const NAV_LINKS = [
  { label: 'HOME', href: '#hero-section', track: true },
  { label: 'EVENTS', href: '/events', track: false },
  { label: 'WORK', href: '#work', track: true },
  { label: 'SERVICES', href: '#services', track: true },
  { label: 'TICKETING', href: '#ticketing', track: true },
  { label: 'CONTACT', href: '#contact', track: true },
]

const TRACKABLE_IDS = NAV_LINKS.filter(l => l.track).map(l => l.href.slice(1))

export default function Nav() {
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
