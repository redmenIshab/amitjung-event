'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Logo from '@/components/marketing/ui/Logo'
import Button from '@/components/marketing/ui/Button'

const NAV_LINKS = [
  { label: 'HOME', href: '/' },
  { label: 'WORK', href: '/work' },
  { label: 'EVENTS', href: '/ticketing' },
  { label: 'TICKETING', href: '/ticketing' },
  { label: 'BRANDING', href: '/branding' },
  { label: 'CONTACT', href: '/contact' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

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

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-20 h-16 md:h-20 transition-all duration-300 ${
          scrolled
            ? 'bg-[rgba(8,8,8,0.92)] backdrop-blur-[12px]'
            : 'bg-transparent'
        }`}
      >
        <Link href="/" className="flex items-center gap-2" aria-label="Lyante Production home">
          <Logo variant="white" height={32} />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-bebas text-sm tracking-widest text-ash hover:text-gold-light transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
          <Button href="/contact" variant="outline" className="ml-4">
            BRIEF US →
          </Button>
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

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-8"
          style={{ backgroundColor: 'rgba(8, 8, 8, 0.6)', backdropFilter: 'blur(8px)' }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-bebas text-4xl tracking-widest text-ivory hover:text-gold transition-colors"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Button href="/contact" variant="gold" className="mt-4">
            BRIEF US →
          </Button>
        </div>
      )}
    </>
  )
}
