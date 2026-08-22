import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Refund accounting.
 *
 * A refund flips the ORIGINAL payment's status from PAID to REFUND — one row
 * per purchase, not a second subtracting row. Analytics predates any code that
 * could write REFUND, so these paths had never executed; they must read a
 * refunded payment as "collected, then given back": counted in gross, counted
 * in refunds, contributing zero to net.
 *
 * Reading it as a pure subtraction double-counts and drives net negative.
 */

const paymentGroupBy = vi.hoisted(() => vi.fn())
const paymentFindMany = vi.hoisted(() => vi.fn())
const eventFindMany = vi.hoisted(() => vi.fn())
const eventFindUnique = vi.hoisted(() => vi.fn())
const ticketGroupBy = vi.hoisted(() => vi.fn())
const ticketFindMany = vi.hoisted(() => vi.fn())
const checkInFindMany = vi.hoisted(() => vi.fn())
const participantCount = vi.hoisted(() => vi.fn())
const userCount = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    payment: { groupBy: paymentGroupBy, findMany: paymentFindMany },
    event: { findMany: eventFindMany, findUnique: eventFindUnique },
    ticket: { groupBy: ticketGroupBy, findMany: ticketFindMany },
    checkIn: { findMany: checkInFindMany },
    participant: { count: participantCount },
    user: { count: userCount },
  },
}))

import {
  getEventAnalytics,
  getEventPeerComparison,
  getPlatformAnalytics,
} from '@/lib/analytics'

beforeEach(() => {
  paymentGroupBy.mockReset()
  paymentFindMany.mockReset().mockResolvedValue([])
  eventFindMany.mockReset().mockResolvedValue([])
  eventFindUnique.mockReset()
  ticketGroupBy.mockReset().mockResolvedValue([])
  ticketFindMany.mockReset().mockResolvedValue([])
  checkInFindMany.mockReset().mockResolvedValue([])
  participantCount.mockReset().mockResolvedValue(0)
  userCount.mockReset().mockResolvedValue(0)
})

/** One PAID purchase of 10,000 and one refunded purchase of 4,500. */
function withOneRefund() {
  paymentGroupBy.mockImplementation((args: { by: string[] }) => {
    if (args.by.includes('eventId')) {
      return [
        { eventId: 'e1', paymentStatus: 'PAID', _sum: { finalAmount: 10_000 } },
        { eventId: 'e1', paymentStatus: 'REFUND', _sum: { finalAmount: 4_500 } },
      ]
    }
    return [
      { paymentStatus: 'PAID', _sum: { finalAmount: 10_000 } },
      { paymentStatus: 'REFUND', _sum: { finalAmount: 4_500 } },
    ]
  })
}

describe('getEventAnalytics — a refunded payment', () => {
  it('counts it in gross and in refunds, netting to the unrefunded remainder', async () => {
    withOneRefund()
    eventFindUnique.mockResolvedValue({
      id: 'e1',
      name: 'E',
      venue: 'V',
      bookingDeadline: new Date(),
      status: 'PUBLISHED',
      eventType: 'CONCERT',
      capacity: 100,
      ticketsAvailable: 100,
      baseTicketPrice: 4500,
      commissionPercentage: 10,
      artist: null,
    })

    const a = await getEventAnalytics('e1')

    // 10,000 collected and kept + 4,500 collected and returned.
    expect(a!.money.grossSales).toBe(14_500)
    expect(a!.money.refunds).toBe(4_500)
    expect(a!.money.netCollected).toBe(10_000)
  })

  it('never reports a negative net when everything is refunded', async () => {
    paymentGroupBy.mockResolvedValue([
      { paymentStatus: 'REFUND', _sum: { finalAmount: 4_500 } },
    ])
    eventFindUnique.mockResolvedValue({
      id: 'e1',
      name: 'E',
      venue: 'V',
      bookingDeadline: new Date(),
      status: 'PUBLISHED',
      eventType: 'CONCERT',
      capacity: 100,
      ticketsAvailable: 100,
      baseTicketPrice: 4500,
      commissionPercentage: 10,
      artist: null,
    })

    const a = await getEventAnalytics('e1')

    expect(a!.money.grossSales).toBe(4_500)
    expect(a!.money.refunds).toBe(4_500)
    expect(a!.money.netCollected).toBe(0)
  })
})

describe('getPlatformAnalytics — a refunded payment', () => {
  it('nets a fully refunded event to zero, not to minus its takings', async () => {
    withOneRefund()
    eventFindMany.mockResolvedValue([
      { id: 'e1', name: 'E1', status: 'PUBLISHED', commissionPercentage: 10 },
    ])

    const a = await getPlatformAnalytics()

    expect(a.money.grossSales).toBe(14_500)
    expect(a.money.refunds).toBe(4_500)
    expect(a.money.netCollected).toBe(10_000)
    // topEvents is built from the per-event net, which must match.
    expect(a.topEvents[0].net).toBe(10_000)
  })
})

describe('getEventPeerComparison — a refunded payment', () => {
  it('contributes zero to an event’s net rather than a negative', async () => {
    paymentGroupBy.mockResolvedValue([
      { eventId: 'e1', paymentStatus: 'PAID', _sum: { finalAmount: 10_000 } },
      { eventId: 'e1', paymentStatus: 'REFUND', _sum: { finalAmount: 4_500 } },
    ])
    eventFindMany.mockResolvedValue([{ id: 'e1', name: 'E1', ticketsAvailable: 100 }])

    const peers = await getEventPeerComparison('e1')

    expect(peers.peers[0].net).toBe(10_000)
  })
})
