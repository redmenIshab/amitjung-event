'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/profile', label: 'Profile' },
  { href: '/tickets', label: 'My Tickets' },
]

/**
 * Shared header for the signed-in account area.
 *
 * `/profile` and `/tickets` keep their own routes — including the ticket
 * drill-downs at /tickets/[eventId]/... — but present as two tabs of one place.
 * The tab bar renders on both, so switching never feels like leaving.
 */
export function AccountHeader({ title }: { title: string }) {
  const pathname = usePathname()

  return (
    <header className="mb-8 md:mb-10">
      <p className="section-label tracking-widest text-gold mb-2">Your Account</p>
      <h1 className="font-bebas text-ivory text-[48px] md:text-[64px] leading-[0.85] tracking-tight uppercase">
        {title}
      </h1>

      <nav aria-label="Account sections" className="mt-5 flex items-center gap-1">
        {TABS.map((tab) => {
          // Drill-downs (/tickets/[eventId]) keep the My Tickets tab lit.
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`relative px-4 py-2.5 font-bebas text-sm tracking-widest uppercase transition-colors ${
                active ? 'text-gold' : 'text-ash hover:text-gold-light'
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gold" />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="h-px w-full bg-gradient-to-r from-gold/60 via-coal/40 to-transparent" />
    </header>
  )
}
