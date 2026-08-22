import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The organizer dashboard is only as confined as the where-clauses that reach
 * Prisma, so this asserts the clauses themselves rather than the rendered
 * numbers — a missed filter is exactly the bug that would leak another event.
 */

const paymentGroupBy = vi.hoisted(() => vi.fn())
const paymentFindMany = vi.hoisted(() => vi.fn())
const eventFindMany = vi.hoisted(() => vi.fn())
const ticketGroupBy = vi.hoisted(() => vi.fn())
const participantCount = vi.hoisted(() => vi.fn())
const userCount = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { groupBy: paymentGroupBy, findMany: paymentFindMany },
    event: { findMany: eventFindMany },
    ticket: { groupBy: ticketGroupBy },
    participant: { count: participantCount },
    user: { count: userCount },
  },
}))

import { getPlatformAnalytics } from '@/lib/analytics'

/** Captures the `where` passed to each query in one run. */
function capture() {
  const seen: Record<string, unknown> = {}
  paymentGroupBy.mockImplementation((args: { by: string[]; where?: unknown }) => {
    // Two different groupBy calls: the totals one and the per-event one.
    seen[args.by.includes('eventId') ? 'paymentsByEvent' : 'paymentTotals'] = args.where
    return []
  })
  paymentFindMany.mockImplementation((args: { where?: unknown }) => {
    seen.salesTrend = args.where
    return []
  })
  eventFindMany.mockImplementation((args: { where?: unknown }) => {
    seen.events = args.where
    return []
  })
  ticketGroupBy.mockImplementation((args: { where?: unknown }) => {
    seen.tickets = args.where
    return []
  })
  return seen
}

describe('getPlatformAnalytics — scoped roll-up', () => {
  beforeEach(() => {
    paymentGroupBy.mockReset()
    paymentFindMany.mockReset()
    eventFindMany.mockReset()
    ticketGroupBy.mockReset()
    participantCount.mockReset().mockResolvedValue(0)
    userCount.mockReset().mockResolvedValue(0)
  })

  it('filters every event aggregate by the supplied ids', async () => {
    const seen = capture()

    await getPlatformAnalytics(['e1'])

    expect(seen.events).toEqual({ id: { in: ['e1'] } })
    expect(seen.paymentTotals).toEqual({ eventId: { in: ['e1'] } })
    expect(seen.paymentsByEvent).toEqual({ eventId: { in: ['e1'] } })
    expect(seen.tickets).toEqual({ eventId: { in: ['e1'] } })
    expect(seen.salesTrend).toEqual({ paymentStatus: 'PAID', eventId: { in: ['e1'] } })
  })

  it('applies no filter when called with no scope', async () => {
    const seen = capture()

    await getPlatformAnalytics()

    expect(seen.events).toBeUndefined()
    expect(seen.paymentTotals).toBeUndefined()
    expect(seen.paymentsByEvent).toBeUndefined()
    expect(seen.tickets).toBeUndefined()
    expect(seen.salesTrend).toEqual({ paymentStatus: 'PAID' })
  })

  it('treats an explicit null as unscoped', async () => {
    const seen = capture()

    await getPlatformAnalytics(null)

    expect(seen.events).toBeUndefined()
  })

  it('an organizer with no assignments totals nothing', async () => {
    const seen = capture()

    const result = await getPlatformAnalytics([])

    // An empty scope must filter to nothing, never fall through to "all".
    expect(seen.events).toEqual({ id: { in: [] } })
    expect(result.events.total).toBe(0)
    expect(result.money.grossSales).toBe(0)
  })
})
