'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut } from 'lucide-react'
import { type AppRole } from '@/lib/rbac'
import { navLinksFor } from './adminNavLinks'

type Props = { userName: string; userRole: AppRole }

export function MobileNav({ userName, userRole }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const navLinks = navLinksFor(userRole)

  return (
    <>
      {/* Fixed top bar — mobile only */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-[#131110] flex items-center justify-between px-4">
        <span className="font-bold tracking-[0.2em] text-gold">LYANTE</span>
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} className="text-ivory" />
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

          <div className="relative z-10 w-64 bg-[#131110] text-ivory flex flex-col h-full shadow-2xl">
            <div className="flex items-start justify-between p-5">
              <div className="min-w-0">
                <p className="text-lg font-bold tracking-[0.2em] text-gold">LYANTE</p>
                <p className="text-[10px] uppercase tracking-[0.25em] text-coal">Control Center</p>
                <p className="text-sm text-ivory mt-3 truncate">{userName}</p>
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider bg-gold/15 text-gold px-1.5 py-0.5 rounded mt-1">
                  {userRole}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
                aria-label="Close menu"
              >
                <X size={20} className="text-ash" />
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1">
              {navLinks.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`)
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      active ? 'bg-gold/15 text-gold-light font-medium' : 'text-ash hover:text-ivory hover:bg-white/5'
                    }`}
                  >
                    {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-gold" />}
                    <Icon size={17} className={active ? 'text-gold' : ''} />
                    {label}
                  </Link>
                )
              })}
            </nav>

            <div className="p-3 border-t border-white/5">
              <Link
                href="/api/auth/signout"
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ash hover:text-ivory hover:bg-white/5 transition-colors w-full"
              >
                <LogOut size={17} />
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
