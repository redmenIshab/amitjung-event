'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, ScanLine, Music } from 'lucide-react'
import { hasCapability, type AppRole, type Capability } from '@/lib/rbac'

const LINKS: { href: string; label: string; icon: typeof LayoutDashboard; cap?: Capability }[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/scanner', label: 'Scanner', icon: ScanLine, cap: 'TICKET_SCAN' },
  { href: '/admin/artists', label: 'Artists', icon: Music },
]

export function AdminSidebarNav({ role }: { role: AppRole }) {
  const pathname = usePathname()
  const links = LINKS.filter((l) => !l.cap || hasCapability(role, l.cap))

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
