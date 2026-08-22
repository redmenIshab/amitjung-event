import { prisma } from '@/lib/prisma'

/**
 * Analytics — the single source of truth for every number the dashboards show.
 *
 * Same reasoning as `events.ts`: the platform dashboard and the per-event
 * dashboard display overlapping metrics, so the arithmetic lives in one place
 * and cannot drift between them.
 *
 * ── The money model ────────────────────────────────────────────────────────
 * Two figures that are easy to conflate:
 *
 *   Gross sales     Σ Payment.finalAmount where PAID — what buyers paid.
 *   Refunds         Σ Payment.finalAmount where REFUND.
 *   Net collected   gross − refunds.
 *   Commission      Lyante's income = rate × net collected.
 *
 * Gross ticket sales is mostly the organizer's money; commission is Lyante's.
 * Commission is charged on NET, so a refunded sale earns nothing.
 *
 * PENDING and REJECTED payments are excluded from every money figure — a
 * started-but-unfinished Khalti checkout is not income.
 *
 * `commissionPercentage` is nullable for events predating the field. Every
 * commission figure is therefore `number | null`, and null MUST render as "—"
 * rather than 0, so an unset rate can never masquerade as zero income.
 */

/** All amounts are whole NPR (the schema stores Int). */
export interface MoneyBreakdown {
  grossSales: number
  refunds: number
  netCollected: number
  /** null when the commission rate is unset. */
  commissionIncome: number | null
  /** null when unset — callers show "not set". */
  commissionRate: number | null
}

// ── Pure calculators ────────────────────────────────────────────────────────

export function netCollected(grossSales: number, refunds: number): number {
  return grossSales - refunds
}

/**
 * Lyante's income. Null rate propagates as null — never coerce to 0, or an
 * event with no agreed terms reports the same as one earning nothing.
 */
export function commissionIncome(net: number, ratePercent: number | null): number | null {
  if (ratePercent === null || ratePercent === undefined) return null
  return Math.round((net * ratePercent) / 100)
}

export function buildMoney(
  grossSales: number,
  refunds: number,
  commissionRate: number | null,
): MoneyBreakdown {
  const net = netCollected(grossSales, refunds)
  return {
    grossSales,
    refunds,
    netCollected: net,
    commissionIncome: commissionIncome(net, commissionRate),
    commissionRate,
  }
}

/** Share of offered inventory actually sold, 0–100. Guards divide-by-zero. */
export function sellThroughRate(sold: number, offered: number): number {
  if (offered <= 0) return 0
  return Math.round((sold / offered) * 100)
}

/** Share of sold tickets scanned in, 0–100. */
export function checkInRate(checkedIn: number, sold: number): number {
  if (sold <= 0) return 0
  return Math.round((checkedIn / sold) * 100)
}

/**
 * Net revenue per PAID ticket. Comped tickets are excluded from the
 * denominator — including them would drag the average toward zero and
 * misrepresent what buyers actually pay.
 */
export function averageTicketPrice(net: number, paidTickets: number): number | null {
  if (paidTickets <= 0) return null
  return Math.round(net / paidTickets)
}

/**
 * Percent change from `previous` to `current`.
 * Null when there is no baseline — "infinite growth" from zero is meaningless.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

/** 1-based rank of `value` in a descending list. Null when there is nothing to rank against. */
export function rankOf(value: number, allValues: number[]): number | null {
  if (allValues.length <= 1) return null
  return allValues.filter((v) => v > value).length + 1
}

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

/** Groups timestamps into per-day counts, ascending. Used by the trend charts. */
export function bucketByDay(dates: Date[]): { day: string; count: number }[] {
  const buckets = new Map<string, number>()
  for (const d of dates) {
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  return [...buckets.entries()]
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day))
}

/** Running total over a day series — for "sales so far" against capacity. */
export function cumulative<T extends { count: number }>(
  series: T[],
): (T & { total: number })[] {
  let total = 0
  return series.map((point) => {
    total += point.count
    return { ...point, total }
  })
}

// ── Queries ─────────────────────────────────────────────────────────────────

export interface EventAnalytics {
  event: {
    id: string
    name: string
    venue: string
    date: Date
    status: string
    eventType: string
    capacity: number
    ticketsAvailable: number
    baseTicketPrice: number
    artistName: string | null
  }
  money: MoneyBreakdown
  averageTicketPrice: number | null
  tickets: {
    total: number
    paid: number
    comped: number
    checkedIn: number
    awaiting: number
    cancelled: number
  }
  sellThrough: number
  checkInRate: number
  /** Per-day paid ticket sales, cumulative total included. */
  salesCurve: { day: string; count: number; total: number }[]
  checkInTimeline: { hour: string; count: number }[]
}

/** Sums PAID and REFUND amounts in one grouped query, optionally scoped. */
async function paymentTotals(scope?: { eventId?: string; eventIds?: string[] | null }) {
  const where = scope?.eventId
    ? { eventId: scope.eventId }
    : scope?.eventIds
      ? { eventId: { in: scope.eventIds } }
      : undefined
  const rows = await prisma.payment.groupBy({
    by: ['paymentStatus'],
    where,
    _sum: { finalAmount: true },
  })
  // A refund flips the ORIGINAL payment from PAID to REFUND — one row per
  // purchase, not a second subtracting row. So a REFUND row is money that WAS
  // collected and then given back: it belongs in gross AND in refunds, netting
  // to zero. Counting it only as a refund would subtract it from a gross it
  // never contributed to, driving net negative.
  let gross = 0
  let refunds = 0
  for (const r of rows) {
    const amount = r._sum.finalAmount ?? 0
    if (r.paymentStatus === 'PAID' || r.paymentStatus === 'REFUND') gross += amount
    if (r.paymentStatus === 'REFUND') refunds += amount
  }
  return { gross, refunds }
}

export async function getEventAnalytics(eventId: string): Promise<EventAnalytics | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { artist: { select: { artistName: true } } },
  })
  if (!event) return null

  const [{ gross, refunds }, ticketRows, checkIns, paidTicketDates] = await Promise.all([
    paymentTotals({ eventId }),
    prisma.ticket.findMany({
      where: { eventId },
      select: { status: true, source: true },
    }),
    prisma.checkIn.findMany({
      where: { ticket: { eventId } },
      select: { scannedAt: true },
      orderBy: { scannedAt: 'asc' },
    }),
    prisma.ticket.findMany({
      where: { eventId, source: 'SELF_REGISTERED' },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const cancelled = ticketRows.filter((t) => t.status === 'CANCELLED').length
  const checkedIn = ticketRows.filter((t) => t.status === 'USED').length
  const comped = ticketRows.filter((t) => t.source === 'ADMIN').length
  const paid = ticketRows.filter((t) => t.source === 'SELF_REGISTERED').length
  // "Sold" excludes cancellations — they occupy no seat and earn nothing.
  const sold = ticketRows.length - cancelled

  const money = buildMoney(gross, refunds, event.commissionPercentage)

  return {
    event: {
      id: event.id,
      name: event.name,
      venue: event.venue,
      // bookingDeadline IS the event date everywhere in the UI (§9).
      date: event.bookingDeadline,
      status: event.status,
      eventType: event.eventType,
      capacity: event.capacity,
      ticketsAvailable: event.ticketsAvailable,
      baseTicketPrice: event.baseTicketPrice,
      artistName: event.artist?.artistName ?? null,
    },
    money,
    averageTicketPrice: averageTicketPrice(money.netCollected, paid),
    tickets: {
      total: ticketRows.length,
      paid,
      comped,
      checkedIn,
      awaiting: ticketRows.filter((t) => t.status === 'UNUSED').length,
      cancelled,
    },
    sellThrough: sellThroughRate(sold, event.ticketsAvailable),
    checkInRate: checkInRate(checkedIn, sold),
    salesCurve: cumulative(bucketByDay(paidTicketDates.map((t) => t.createdAt))),
    checkInTimeline: bucketByHour(checkIns.map((c) => c.scannedAt)),
  }
}

/** Hour buckets for the check-in timeline (doors open over hours, not days). */
export function bucketByHour(dates: Date[]): { hour: string; count: number }[] {
  const buckets = new Map<string, number>()
  for (const d of dates) {
    const key = d.toISOString().slice(0, 13) + ':00'
    buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }
  return [...buckets.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour))
}

export interface EventPeerComparison {
  /** Null when there are fewer than two events with sales to compare. */
  rankByNet: number | null
  totalRanked: number
  medianNet: number
  medianSellThrough: number
  /** This event's net vs the median, as a percent difference. Null without a baseline. */
  netVsMedian: number | null
  peers: { id: string; name: string; net: number; isSubject: boolean }[]
}

/**
 * Positions one event against the others on the platform.
 *
 * Deliberately returns nulls rather than fabricated context when the platform
 * has too little history — a "rank #1 of 1" would read as success.
 */
export async function getEventPeerComparison(eventId: string): Promise<EventPeerComparison> {
  const events = await prisma.event.findMany({
    select: { id: true, name: true, ticketsAvailable: true },
  })

  const [payments, ticketRows] = await Promise.all([
    prisma.payment.groupBy({
      by: ['eventId', 'paymentStatus'],
      _sum: { finalAmount: true },
    }),
    prisma.ticket.groupBy({ by: ['eventId', 'status'], _count: true }),
  ])

  const netByEvent = new Map<string, number>()
  for (const p of payments) {
    // Net = kept money. A PAID payment adds its amount; a REFUND payment was
    // collected and returned, so it nets zero — never a negative, which is what
    // subtracting it from a gross it no longer contributes to would produce.
    if (p.paymentStatus !== 'PAID') continue
    netByEvent.set(p.eventId, (netByEvent.get(p.eventId) ?? 0) + (p._sum.finalAmount ?? 0))
  }

  const soldByEvent = new Map<string, number>()
  for (const t of ticketRows) {
    if (t.status === 'CANCELLED') continue
    soldByEvent.set(t.eventId, (soldByEvent.get(t.eventId) ?? 0) + t._count)
  }

  const peers = events
    .map((e) => ({
      id: e.id,
      name: e.name,
      net: netByEvent.get(e.id) ?? 0,
      isSubject: e.id === eventId,
    }))
    .sort((a, b) => b.net - a.net)

  const nets = peers.map((p) => p.net)
  const subjectNet = netByEvent.get(eventId) ?? 0
  const med = median(nets)

  return {
    rankByNet: rankOf(subjectNet, nets),
    totalRanked: peers.length,
    medianNet: med,
    medianSellThrough: median(
      events.map((e) => sellThroughRate(soldByEvent.get(e.id) ?? 0, e.ticketsAvailable)),
    ),
    netVsMedian: percentChange(subjectNet, med),
    peers,
  }
}

export interface PlatformAnalytics {
  money: { grossSales: number; refunds: number; netCollected: number }
  /** Summed per event, so each event's own rate applies. Null when no rate is set anywhere. */
  commissionIncome: number | null
  eventsWithoutRate: number
  tickets: { total: number; paid: number; comped: number; checkedIn: number; cancelled: number }
  checkInRate: number
  users: { participants: number; newParticipants30d: number; staff: number }
  events: { total: number; draft: number; published: number; completed: number; cancelled: number }
  /** Net sales per day across the platform. */
  salesTrend: { day: string; count: number }[]
  topEvents: { id: string; name: string; net: number; sold: number }[]
}

/**
 * Platform roll-up.
 *
 * @param eventIds Restricts every event aggregate to these events. `null` or
 *   omitted is the platform-wide view (ADMIN). An event-scoped role passes its
 *   assigned ids so the dashboard never totals events it cannot see — note an
 *   empty array filters to nothing rather than falling through to "all".
 */
export async function getPlatformAnalytics(
  eventIds?: string[] | null,
): Promise<PlatformAnalytics> {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const eventWhere = eventIds ? { id: { in: eventIds } } : undefined
  const byEventWhere = eventIds ? { eventId: { in: eventIds } } : undefined

  const [
    { gross, refunds },
    perEventPayments,
    events,
    ticketRows,
    participants,
    newParticipants30d,
    staff,
    paidPayments,
  ] = await Promise.all([
    paymentTotals({ eventIds }),
    prisma.payment.groupBy({
      by: ['eventId', 'paymentStatus'],
      where: byEventWhere,
      _sum: { finalAmount: true },
    }),
    prisma.event.findMany({
      where: eventWhere,
      select: { id: true, name: true, status: true, commissionPercentage: true },
    }),
    prisma.ticket.groupBy({
      by: ['eventId', 'status', 'source'],
      where: byEventWhere,
      _count: true,
    }),
    prisma.participant.count({ where: { deletedAt: null } }),
    prisma.participant.count({ where: { deletedAt: null, createdAt: { gte: since30d } } }),
    prisma.user.count({ where: { deletedAt: null, role: { not: 'USER' } } }),
    prisma.payment.findMany({
      where: { paymentStatus: 'PAID', ...(byEventWhere ?? {}) },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // Net per event, so each event's own commission rate can be applied.
  const netByEvent = new Map<string, number>()
  for (const p of perEventPayments) {
    // Net = kept money. A PAID payment adds its amount; a REFUND payment was
    // collected and returned, so it nets zero — never a negative, which is what
    // subtracting it from a gross it no longer contributes to would produce.
    if (p.paymentStatus !== 'PAID') continue
    netByEvent.set(p.eventId, (netByEvent.get(p.eventId) ?? 0) + (p._sum.finalAmount ?? 0))
  }

  let commissionTotal: number | null = null
  let eventsWithoutRate = 0
  for (const e of events) {
    const earned = commissionIncome(netByEvent.get(e.id) ?? 0, e.commissionPercentage)
    if (earned === null) {
      // Only counts as a gap if there was money to take a cut of.
      if ((netByEvent.get(e.id) ?? 0) > 0) eventsWithoutRate += 1
      continue
    }
    commissionTotal = (commissionTotal ?? 0) + earned
  }

  const soldByEvent = new Map<string, number>()
  const t = { total: 0, paid: 0, comped: 0, checkedIn: 0, cancelled: 0 }
  for (const row of ticketRows) {
    t.total += row._count
    if (row.source === 'ADMIN') t.comped += row._count
    else t.paid += row._count
    if (row.status === 'USED') t.checkedIn += row._count
    if (row.status === 'CANCELLED') t.cancelled += row._count
    else soldByEvent.set(row.eventId, (soldByEvent.get(row.eventId) ?? 0) + row._count)
  }

  const byStatus = (s: string) => events.filter((e) => e.status === s).length

  return {
    money: { grossSales: gross, refunds, netCollected: netCollected(gross, refunds) },
    commissionIncome: commissionTotal,
    eventsWithoutRate,
    tickets: t,
    checkInRate: checkInRate(t.checkedIn, t.total - t.cancelled),
    users: { participants, newParticipants30d, staff },
    events: {
      total: events.length,
      draft: byStatus('DRAFT'),
      published: byStatus('PUBLISHED'),
      completed: byStatus('COMPLETED'),
      cancelled: byStatus('CANCELLED'),
    },
    salesTrend: bucketByDay(paidPayments.map((p) => p.createdAt)),
    topEvents: events
      .map((e) => ({
        id: e.id,
        name: e.name,
        net: netByEvent.get(e.id) ?? 0,
        sold: soldByEvent.get(e.id) ?? 0,
      }))
      .sort((a, b) => b.net - a.net)
      .slice(0, 8),
  }
}
