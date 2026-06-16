'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, LayoutDashboard, Calendar, ScanLine, LogOut } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

type Props = { userName: string; userRole: string }

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/scanner', label: 'Scanner', icon: ScanLine },
]

export function MobileNav({ userName, userRole }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Fixed top bar — mobile only */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white border-b flex items-center justify-between px-4">
        <span className="font-bold text-gray-900">Event Tickets</span>
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={22} className="text-gray-700" />
        </button>
      </header>

      {/* Drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Slide-in panel */}
          <div className="relative z-10 w-64 bg-white flex flex-col h-full shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between p-4">
              <div>
                <p className="font-bold text-gray-900">Event Tickets</p>
                <p className="text-xs text-gray-500 mt-0.5">{userName}</p>
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-1">
                  {userRole}
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Close menu"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <Separator />

            {/* Nav links */}
            <nav className="flex-1 p-3 space-y-1">
              {links.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Icon size={17} />
                  {label}
                </Link>
              ))}
            </nav>

            <Separator />

            <div className="p-3">
              <Link
                href="/api/auth/signout"
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-gray-500 hover:bg-gray-100 transition-colors w-full"
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
