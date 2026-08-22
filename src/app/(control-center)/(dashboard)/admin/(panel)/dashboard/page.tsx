import Link from 'next/link'
import {
  Wallet,
  Percent,
  Ticket,
  CheckCircle2,
  Users,
  UserPlus,
  CalendarDays,
  Gift,
  BarChart3,
} from 'lucide-react'
import { requirePageCapability, hasCapability } from '@/lib/rbac'
import { visibleEventIds } from '@/lib/eventAccess'
import { getPlatformAnalytics } from '@/lib/analytics'
import { getCachedUpcomingEvents } from '@/lib/upstash/services/event-cache'
import { StatTile } from '@/components/dashboard/StatTile'
import { ChartCard } from '@/components/dashboard/ChartCard'
import {
  SalesTrendChart,
  TopEventsChart,
  TicketStatusChart,
} from '@/components/dashboard/charts'
import { npr, nprCompact, shortDay } from '@/components/dashboard/viz'
import { Separator } from '@/components/ui/separator'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await requirePageCapability('DASHBOARD_VIEW')
  // Money splits two ways: an organizer sees sales for their own events,
  // ADMIN additionally sees commission and platform-wide figures.
  const canSeeSales = hasCapability(session.user.role, 'SALES_READ')
  const canSeeCommission = hasCapability(session.user.role, 'FINANCE_READ')
  // null = the whole platform; an array confines every figure to those events.
  const scope = await visibleEventIds(session)

  const [a, allUpcoming] = await Promise.all([
    getPlatformAnalytics(scope),
    getCachedUpcomingEvents(),
  ])
  const upcomingEvents = scope
    ? allUpcoming.filter((e) => scope.includes(e.id))
    : allUpcoming

  const sold = a.tickets.total - a.tickets.cancelled

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">
          {scope
            ? 'All-time performance across your events'
            : 'All-time performance across every event'}
        </p>
      </div>

      {/* ── Financial ── */}
      {canSeeSales && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Financial</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile
              label="Net collected"
              value={nprCompact(a.money.netCollected)}
              hint={`${npr(a.money.grossSales)} gross · ${npr(a.money.refunds)} refunded`}
              icon={Wallet}
              accent="text-gold-deep bg-gold/10"
            />
            {canSeeCommission && (
              <StatTile
                label="Lyante commission"
                value={a.commissionIncome === null ? '—' : nprCompact(a.commissionIncome)}
                hint={
                  a.eventsWithoutRate > 0
                    ? `${a.eventsWithoutRate} event${a.eventsWithoutRate === 1 ? '' : 's'} with sales have no rate set`
                    : 'Summed per event at its own rate'
                }
                icon={Percent}
                accent="text-emerald-700 bg-emerald-50"
              />
            )}
            <StatTile
              label="Refund rate"
              value={
                a.money.grossSales > 0
                  ? `${Math.round((a.money.refunds / a.money.grossSales) * 100)}%`
                  : '—'
              }
              hint={a.money.refunds > 0 ? npr(a.money.refunds) : 'No refunds'}
              icon={Percent}
              accent="text-gray-500 bg-gray-100"
            />
            <StatTile
              label="Avg per paid ticket"
              value={
                a.tickets.paid > 0
                  ? nprCompact(Math.round(a.money.netCollected / a.tickets.paid))
                  : '—'
              }
              hint={`Across ${a.tickets.paid.toLocaleString()} paid tickets`}
              icon={Ticket}
              accent="text-blue-700 bg-blue-50"
            />
          </div>
          {canSeeCommission && a.eventsWithoutRate > 0 && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Commission excludes {a.eventsWithoutRate} event
              {a.eventsWithoutRate === 1 ? '' : 's'} that made sales without a
              commission rate on record — total income is understated until those
              rates are set.
            </p>
          )}
        </section>
      )}

      {/* ── Volume ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Tickets &amp; audience</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            label="Tickets sold"
            value={sold.toLocaleString()}
            hint={`${a.tickets.cancelled.toLocaleString()} cancelled`}
            icon={Ticket}
            accent="text-gold-deep bg-gold/10"
          />
          <StatTile
            label="Checked in"
            value={a.tickets.checkedIn.toLocaleString()}
            hint={`${a.checkInRate}% of sold tickets`}
            icon={CheckCircle2}
            accent="text-emerald-700 bg-emerald-50"
          />
          {/* Platform-wide people counts cannot be scoped to an event, so they
              are hidden from event-scoped roles rather than shown as figures
              that have nothing to do with their show. Keyed on `scope`, not on
              a money capability — STAFF and MANAGER saw these before and must
              keep seeing them. */}
          {!scope && (
            <>
              <StatTile
                label="Registered users"
                value={a.users.participants.toLocaleString()}
                hint={`${a.users.staff} staff account${a.users.staff === 1 ? '' : 's'}`}
                icon={Users}
                accent="text-blue-700 bg-blue-50"
              />
              <StatTile
                label="New users"
                value={a.users.newParticipants30d.toLocaleString()}
                hint="Joined in the last 30 days"
                icon={UserPlus}
                accent="text-gray-500 bg-gray-100"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            label="Events"
            value={a.events.total.toLocaleString()}
            hint={`${a.events.published} on sale · ${a.events.draft} draft`}
            icon={CalendarDays}
            accent="text-gray-500 bg-gray-100"
          />
          <StatTile
            label="Completed"
            value={a.events.completed.toLocaleString()}
            hint={`${a.events.cancelled} cancelled`}
            icon={CheckCircle2}
            accent="text-gray-500 bg-gray-100"
          />
          <StatTile
            label="Comped tickets"
            value={a.tickets.comped.toLocaleString()}
            hint="Admin-issued · no revenue"
            icon={Gift}
            accent="text-gray-500 bg-gray-100"
          />
          <StatTile
            label="Paid tickets"
            value={a.tickets.paid.toLocaleString()}
            hint="Bought through checkout"
            icon={Ticket}
            accent="text-gray-500 bg-gray-100"
          />
        </div>
      </section>

      <Separator />

      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Purchases over time"
          subtitle={
            scope ? 'Completed payments per day, your events' : 'Completed payments per day, all events'
          }
          columns={['Day', 'Purchases']}
          rows={a.salesTrend.map((d) => [shortDay(d.day), d.count])}
          empty="No completed purchases yet."
        >
          <SalesTrendChart data={a.salesTrend} />
        </ChartCard>

        <ChartCard
          title="Ticket status"
          subtitle={
            scope ? 'Every issued ticket for your events' : 'Every issued ticket across the platform'
          }
          columns={['Status', 'Tickets']}
          rows={[
            ['Checked in', a.tickets.checkedIn],
            ['Awaiting', a.tickets.total - a.tickets.checkedIn - a.tickets.cancelled],
            ['Cancelled', a.tickets.cancelled],
          ]}
          empty="No tickets issued yet."
        >
          <TicketStatusChart
            checkedIn={a.tickets.checkedIn}
            awaiting={a.tickets.total - a.tickets.checkedIn - a.tickets.cancelled}
            cancelled={a.tickets.cancelled}
          />
        </ChartCard>
      </section>

      {canSeeSales && (
        <ChartCard
          title="Top events by net sales"
          subtitle="Highest-earning events, after refunds"
          columns={['Event', 'Net collected', 'Sold']}
          rows={a.topEvents.map((e) => [e.name, npr(e.net), e.sold])}
          empty="No event has recorded sales yet."
        >
          <TopEventsChart data={a.topEvents} />
        </ChartCard>
      )}

      <Separator />

      <section>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Upcoming events</h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-gray-400 text-sm">No upcoming events.</p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between gap-3 p-3 bg-white border border-black/5 rounded-lg"
              >
                <Link href={`/admin/events/${event.id}`} className="min-w-0 flex-1 group">
                  <p className="font-medium text-gray-900 truncate group-hover:underline">
                    {event.name}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {event.venue} · {new Date(event.date).toLocaleDateString()}
                  </p>
                </Link>
                <span className="text-sm text-gray-400 shrink-0 tabular-nums">
                  {event._count.tickets} tickets
                </span>
                <Link
                  href={`/admin/events/${event.id}/analytics`}
                  aria-label={`Analytics for ${event.name}`}
                  className="shrink-0 text-gray-400 hover:text-gray-900 transition-colors"
                >
                  <BarChart3 size={16} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
