import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Ticket, CheckCircle2, Gift, TrendingUp, Wallet, Percent } from 'lucide-react'
import { requirePageCapability, hasCapability } from '@/lib/rbac'
import { getEventAnalytics, getEventPeerComparison } from '@/lib/analytics'
import { StatTile } from '@/components/dashboard/StatTile'
import { ChartCard } from '@/components/dashboard/ChartCard'
import {
  SalesCurveChart,
  CheckInTimelineChart,
  TicketStatusChart,
  PeerComparisonChart,
} from '@/components/dashboard/charts'
import { npr, nprOrDash, nprCompact, shortDay, shortHour } from '@/components/dashboard/viz'
import { DownloadAnalyticsPdf } from '@/components/dashboard/DownloadAnalyticsPdf'
import type { AnalyticsPdfInput } from '@/lib/analyticsPdf'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

/** Chart container ids, shared between the cards and the PDF exporter. */
const CHART_IDS = {
  status: 'chart-ticket-status',
  sales: 'chart-sales-curve',
  doors: 'chart-door-arrivals',
  peers: 'chart-peer-comparison',
} as const

type Props = { params: Promise<{ eventId: string }> }

export const dynamic = 'force-dynamic'

export default async function EventAnalyticsPage({ params }: Props) {
  // Volume metrics are open to anyone who can read analytics; money is gated
  // separately below so door staff don't see organizer commercial terms.
  const session = await requirePageCapability('ANALYTICS_READ')
  const canSeeMoney = hasCapability(session.user.role, 'FINANCE_READ')

  const { eventId } = await params
  const [a, peers] = await Promise.all([
    getEventAnalytics(eventId),
    getEventPeerComparison(eventId),
  ])
  if (!a) notFound()

  const sold = a.tickets.total - a.tickets.cancelled
  const remaining = Math.max(0, a.event.ticketsAvailable - sold)

  // Built server-side so restricted figures are never sent to a client that
  // isn't allowed them — `money: null` omits them from the payload entirely.
  const pdfInput: AnalyticsPdfInput = {
    event: {
      name: a.event.name,
      venue: a.event.venue,
      date: a.event.date.toISOString(),
      status: a.event.status,
      eventType: a.event.eventType,
      artistName: a.event.artistName,
      capacity: a.event.capacity,
      ticketsAvailable: a.event.ticketsAvailable,
      baseTicketPrice: a.event.baseTicketPrice,
    },
    money: canSeeMoney
      ? {
          grossSales: a.money.grossSales,
          refunds: a.money.refunds,
          netCollected: a.money.netCollected,
          commissionIncome: a.money.commissionIncome,
          commissionRate: a.money.commissionRate,
          averageTicketPrice: a.averageTicketPrice,
        }
      : null,
    tickets: a.tickets,
    sellThrough: a.sellThrough,
    checkInRate: a.checkInRate,
    peers: canSeeMoney
      ? {
          rankByNet: peers.rankByNet,
          totalRanked: peers.totalRanked,
          medianNet: peers.medianNet,
          medianSellThrough: peers.medianSellThrough,
          netVsMedian: peers.netVsMedian,
          rows: peers.peers.map((p) => ({ name: p.name, net: p.net, isSubject: p.isSubject })),
        }
      : null,
    charts: [
      { id: CHART_IDS.status, caption: 'Ticket status' },
      { id: CHART_IDS.sales, caption: 'Cumulative paid sales' },
      { id: CHART_IDS.doors, caption: 'Door arrivals per hour' },
      ...(canSeeMoney && peers.rankByNet !== null
        ? [{ id: CHART_IDS.peers, caption: 'Net sales by event' }]
        : []),
    ],
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/admin/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-3"
        >
          <ArrowLeft size={15} />
          Back to event
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{a.event.name}</h1>
              <Badge variant="outline">{a.event.status}</Badge>
            </div>
            <p className="text-gray-500 text-sm mt-1">
              {a.event.venue} · {new Date(a.event.date).toLocaleDateString()} ·{' '}
              {a.event.eventType}
              {a.event.artistName && ` · ${a.event.artistName}`}
            </p>
          </div>
          <DownloadAnalyticsPdf input={pdfInput} />
        </div>
      </div>

      {/* ── Money ── */}
      {canSeeMoney ? (
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
            <StatTile
              label="Lyante commission"
              value={
                a.money.commissionIncome === null
                  ? '—'
                  : nprCompact(a.money.commissionIncome)
              }
              hint={
                a.money.commissionRate === null
                  ? 'No rate on record — set it on the event'
                  : `${a.money.commissionRate}% of net collected`
              }
              icon={Percent}
              accent="text-emerald-700 bg-emerald-50"
            />
            <StatTile
              label="Avg ticket price"
              value={nprOrDash(a.averageTicketPrice)}
              hint={`Across ${a.tickets.paid.toLocaleString()} paid · list ${npr(a.event.baseTicketPrice)}`}
              icon={TrendingUp}
              accent="text-blue-700 bg-blue-50"
            />
            <StatTile
              label="Refund rate"
              value={
                a.money.grossSales > 0
                  ? `${Math.round((a.money.refunds / a.money.grossSales) * 100)}%`
                  : '—'
              }
              hint={
                a.money.refunds > 0
                  ? `${npr(a.money.refunds)} returned to buyers`
                  : 'No refunds'
              }
              icon={Percent}
              accent="text-gray-500 bg-gray-100"
            />
          </div>
          {a.money.commissionRate === null && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              This event has no commission rate recorded, so its income cannot be
              calculated. Add the agreed rate in{' '}
              <Link href={`/admin/events/${eventId}/edit`} className="underline">
                event settings
              </Link>
              .
            </p>
          )}
        </section>
      ) : (
        <p className="text-xs text-gray-500 bg-gray-50 border border-black/5 rounded-md px-3 py-2">
          Financial figures are restricted to administrators.
        </p>
      )}

      <Separator />

      {/* ── Inventory & attendance ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Inventory &amp; attendance</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            label="Sold"
            value={sold.toLocaleString()}
            hint={`of ${a.event.ticketsAvailable.toLocaleString()} offered · ${a.event.capacity.toLocaleString()} capacity`}
            icon={Ticket}
            accent="text-gold-deep bg-gold/10"
          />
          <StatTile
            label="Sell-through"
            value={`${a.sellThrough}%`}
            hint={`${remaining.toLocaleString()} still available`}
            icon={TrendingUp}
            accent="text-blue-700 bg-blue-50"
          />
          <StatTile
            label="Checked in"
            value={a.tickets.checkedIn.toLocaleString()}
            hint={`${a.checkInRate}% of sold tickets`}
            icon={CheckCircle2}
            accent="text-emerald-700 bg-emerald-50"
          />
          <StatTile
            label="Comped"
            value={a.tickets.comped.toLocaleString()}
            hint="Admin-issued · no revenue"
            icon={Gift}
            accent="text-gray-500 bg-gray-100"
          />
        </div>

        <ChartCard
          title="Ticket status"
          subtitle="Every issued ticket, by current state"
          columns={['Status', 'Tickets']}
          rows={[
            ['Checked in', a.tickets.checkedIn],
            ['Awaiting', a.tickets.awaiting],
            ['Cancelled', a.tickets.cancelled],
          ]}
          empty="No tickets issued yet."
          chartId={CHART_IDS.status}
        >
          <TicketStatusChart
            checkedIn={a.tickets.checkedIn}
            awaiting={a.tickets.awaiting}
            cancelled={a.tickets.cancelled}
          />
        </ChartCard>
      </section>

      <Separator />

      {/* ── Time series ── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Sales to date"
          subtitle={`Cumulative paid tickets against ${a.event.ticketsAvailable.toLocaleString()} offered`}
          columns={['Day', 'Sold', 'Running total']}
          rows={a.salesCurve.map((d) => [shortDay(d.day), d.count, d.total])}
          empty="No paid sales recorded for this event."
          chartId={CHART_IDS.sales}
        >
          <SalesCurveChart data={a.salesCurve} offered={a.event.ticketsAvailable} />
        </ChartCard>

        <ChartCard
          title="Door arrivals"
          subtitle="Scans per hour"
          columns={['Hour', 'Scans']}
          rows={a.checkInTimeline.map((d) => [shortHour(d.hour), d.count])}
          empty="No tickets have been scanned yet."
          chartId={CHART_IDS.doors}
        >
          <CheckInTimelineChart data={a.checkInTimeline} />
        </ChartCard>
      </section>

      {canSeeMoney && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Against other events</h2>

            {peers.rankByNet === null ? (
              <p className="text-sm text-gray-500 bg-gray-50 border border-black/5 rounded-md px-3 py-3">
                There aren&apos;t enough events on the platform yet to compare against.
                Comparison appears once a second event has sales.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <StatTile
                    label="Rank by net sales"
                    value={`#${peers.rankByNet}`}
                    hint={`of ${peers.totalRanked} events`}
                    icon={TrendingUp}
                    accent="text-gold-deep bg-gold/10"
                  />
                  <StatTile
                    label="vs median event"
                    value={
                      peers.netVsMedian === null
                        ? '—'
                        : `${peers.netVsMedian > 0 ? '+' : ''}${peers.netVsMedian}%`
                    }
                    hint={`Median is ${npr(peers.medianNet)}`}
                    icon={Wallet}
                    accent="text-blue-700 bg-blue-50"
                  />
                  <StatTile
                    label="Sell-through vs median"
                    value={`${a.sellThrough}% vs ${peers.medianSellThrough}%`}
                    hint="This event against the platform median"
                    icon={Percent}
                    accent="text-gray-500 bg-gray-100"
                  />
                </div>

                <ChartCard
                  title="Net sales by event"
                  subtitle="This event highlighted against the rest of the platform"
                  columns={['Event', 'Net collected']}
                  rows={peers.peers.map((p) => [
                    p.isSubject ? `${p.name} (this event)` : p.name,
                    npr(p.net),
                  ])}
                  chartId={CHART_IDS.peers}
                >
                  <PeerComparisonChart data={peers.peers} />
                </ChartCard>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
