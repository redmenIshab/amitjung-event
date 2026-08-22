import { requirePageCapability } from '@/lib/rbac'
import Link from 'next/link'
import { LogOut } from 'lucide-react'
import { MobileNav } from '@/components/layout/MobileNav'
import { AdminSidebarNav } from '@/components/layout/AdminSidebarNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requirePageCapability('DASHBOARD_VIEW')

  return (
    <div className="dashboard-scope flex min-h-screen bg-[#f7f6f3]">
      {/* ── Desktop sidebar (md+) ──
          Sticky and exactly one viewport tall. It used to be a stretched flex
          child, so on a long page (an event's ticket table, the activity feed)
          it grew to the full content height and scrolled out of sight along
          with it. `self-start` stops the stretch that would otherwise override
          the height. Narrower between md and lg, where 240px eats too much of
          the content column. */}
      <aside className="hidden md:flex md:sticky md:top-0 md:h-screen self-start md:w-52 lg:w-60 bg-[#131110] text-ivory flex-col shrink-0 border-r border-black/40">
        <div className="p-5">
          <h1 className="text-lg font-bold tracking-[0.2em] text-gold">LYANTE</h1>
          <p className="text-[10px] uppercase tracking-[0.25em] text-coal mt-0.5">Control Center</p>
        </div>

        <div className="mx-5 mb-2 rounded-lg bg-white/[0.04] border border-white/5 px-3 py-2.5">
          <p className="text-sm text-ivory truncate">{session.user.name}</p>
          <span className="inline-block text-[10px] font-semibold uppercase tracking-wider bg-gold/15 text-gold px-1.5 py-0.5 rounded mt-1">
            {session.user.role}
          </span>
        </div>

        <AdminSidebarNav role={session.user.role} />

        <div className="p-3 border-t border-white/5">
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-ash hover:text-ivory hover:bg-white/5 transition-colors w-full"
          >
            <LogOut size={17} />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* ── Mobile top bar + drawer ── */}
      <MobileNav userName={session.user.name ?? ''} userRole={session.user.role} />

      {/* ── Main content ── */}
      {/* pt-14 clears the fixed mobile header; md:pt-0 removes it on desktop */}
      <main className="flex-1 pt-14 md:pt-0 p-4 md:p-8 min-w-0">
        {children}
      </main>
    </div>
  )
}
