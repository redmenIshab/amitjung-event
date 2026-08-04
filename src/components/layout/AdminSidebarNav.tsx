'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type AppRole } from '@/lib/rbac'
import { navLinksFor } from './adminNavLinks'

export function AdminSidebarNav({ role }: { role: AppRole }) {
  const pathname = usePathname()
  const links = navLinksFor(role)

  return (
    <nav className="flex-1 p-3 space-y-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              active
                ? 'bg-gold/15 text-gold-light font-medium'
                : 'text-ash hover:text-ivory hover:bg-white/5'
            }`}
          >
            {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gold" />}
            <Icon size={17} className={active ? 'text-gold' : ''} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
