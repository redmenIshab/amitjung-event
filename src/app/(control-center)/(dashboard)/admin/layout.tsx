import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'
import { LogOut, LayoutDashboard, Calendar, ScanLine, Music } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { MobileNav } from '@/components/layout/MobileNav'

const ADMIN_ROLES = ['ADMIN', 'STAFF', 'MANAGER'] as const

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!ADMIN_ROLES.includes(session.user.role as typeof ADMIN_ROLES[number])) redirect('/')

  return (
    <div className="dashboard-scope flex min-h-screen bg-gray-50">
      {/* ── Desktop sidebar (md+) ── */}
      <aside className="hidden md:flex w-56 bg-white border-r flex-col shrink-0">
        <div className="p-4">
          <h1 className="text-lg font-bold text-gray-900">Event Tickets</h1>
          <p className="text-xs text-gray-500 mt-0.5">{session.user.name}</p>
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded mt-1">
            {session.user.role}
          </span>
        </div>
        <Separator />
        <nav className="flex-1 p-3 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LayoutDashboard size={16} />
            Dashboard
          </Link>
          <Link
            href="/events"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Calendar size={16} />
            Events
          </Link>
          <Link
            href="/scanner"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ScanLine size={16} />
            Scanner
          </Link>
          <Link
            href="/admin/artists"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Music size={16} />
            Artists
          </Link>
        </nav>
        <Separator />
        <div className="p-3">
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-gray-500 hover:bg-gray-100 transition-colors w-full"
          >
            <LogOut size={16} />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* ── Mobile top bar + drawer ── */}
      <MobileNav userName={session.user.name ?? ''} userRole={session.user.role} />

      {/* ── Main content ── */}
      {/* pt-14 clears the fixed mobile header; md:pt-0 removes it on desktop */}
      <main className="flex-1 pt-14 md:pt-0 p-4 md:p-8 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
