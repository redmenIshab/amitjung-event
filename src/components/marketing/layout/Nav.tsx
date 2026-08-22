'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

/**
 * Primary navigation.
 *
 * `/events` is the buyer-facing listing (browse shows, buy tickets);
 * `/ticketing` is the organiser-facing product page. Labelled "EVENTS &
 * TICKETS" and "SMART TICKETING" so the two stop reading as the same thing —
 * the latter matches the name that page already gives itself in its metadata
 * and hero.
 *
 * Contact deliberately lives only in the footer: it was the sixth item in a bar
 * that was already crowded, and duplicating it here bought nothing.
 */
const NAV_LINKS = [
  { label: 'HOME', href: '/' },
  { label: 'EVENTS & TICKETS', href: '/events' },
  { label: 'ABOUT US', href: '/about' },
  { label: 'SERVICES', href: '/branding' },
  { label: 'SMART TICKETING', href: '/ticketing' },
]

export default function Nav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Public CTA. One entry for anyone signed in — My Tickets is a tab inside the
  // account area (see AccountHeader), so it does not need its own nav slot.
  // Keys off session presence, not PARTICIPANT alone: buyers self-registered as
  // USER were previously shown LOGIN while already signed in.
  const cta = session?.user
    ? { href: '/profile', label: 'ACCOUNT' }
    : { href: '/auth/login', label: 'LOGIN' }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 80)
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <>
      <nav
        // No background fill at all — the bar sits directly on the page and the
        // gold text outline carries legibility. Scrolling adds only a blur, so
        // busy content passing underneath doesn't fight the links.
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-20 h-16 md:h-20 bg-transparent transition-all duration-300 ${
          scrolled ? 'backdrop-blur-[10px]' : ''
        }`}
      >
        <Link href="/" className="flex items-center gap-2" aria-label="Lyante Production home">
          <span className="font-bebas text-xl tracking-widest text-gold nav-text-outline">LYANTE</span>
        </Link>

        {/* Tighter spacing between md and lg: the longer "EVENTS & TICKETS" and
            "SMART TICKETING" labels overflow the bar at 768px on gap-8 (measured
            624px against 608px available). gap-8 returns at lg, where the
            original spacing was tuned. */}
        <div className="hidden md:flex items-center gap-5 lg:gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-bebas text-sm tracking-widest nav-text-outline transition-colors duration-200 ${
                isActive(link.href) ? 'text-gold' : 'text-ash hover:text-gold-light'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={cta.href}
            className="inline-flex items-center gap-2 px-5 py-2 font-bebas text-sm tracking-widest uppercase border border-gold text-gold nav-text-outline hover:bg-gold hover:text-white hover:text-bg transition-all duration-250 min-h-[40px] ml-4"
          >
            {cta.label}
          </Link>
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
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-bebas text-4xl tracking-widest nav-text-outline transition-colors ${
                isActive(link.href) ? 'text-gold' : 'text-ivory hover:text-gold'
              }`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={cta.href}
            className="inline-flex items-center gap-2 px-6 py-3 font-bebas text-sm tracking-widest uppercase bg-gold text-bg hover:opacity-90 transition-all duration-250 min-h-[48px] mt-4"
            onClick={() => setMenuOpen(false)}
          >
            {cta.label}
          </Link>
        </div>
      )}
    </>
  )
}
