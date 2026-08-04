'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

const NAV_LINKS = [
  { label: 'HOME', href: '/' },
  { label: 'EVENTS', href: '/events' },
  { label: 'WORK', href: '/work' },
  { label: 'SERVICES', href: '/branding' },
  { label: 'TICKETING', href: '/ticketing' },
  { label: 'CONTACT', href: '/contact' },
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
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-20 h-16 md:h-20 transition-all duration-300 ${
          scrolled ? 'bg-[rgba(8,8,8,0.92)] backdrop-blur-[12px]' : 'bg-transparent'
        }`}
      >
        <Link href="/" className="flex items-center gap-2" aria-label="Lyante Production home">
          <span className="font-bebas text-xl tracking-widest text-gold">LYANTE</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-bebas text-sm tracking-widest transition-colors duration-200 ${
                isActive(link.href) ? 'text-gold' : 'text-ash hover:text-gold-light'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={cta.href}
            className="inline-flex items-center gap-2 px-5 py-2 font-bebas text-sm tracking-widest uppercase border border-gold text-gold hover:bg-gold hover:text-white hover:text-bg transition-all duration-250 min-h-[40px] ml-4"
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
              className={`font-bebas text-4xl tracking-widest transition-colors ${
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
