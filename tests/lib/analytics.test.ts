import { describe, it, expect } from 'vitest'
import {
  netCollected,
  commissionIncome,
  buildMoney,
  sellThroughRate,
  checkInRate,
  averageTicketPrice,
  percentChange,
  rankOf,
  median,
  bucketByDay,
  bucketByHour,
  cumulative,
} from '@/lib/analytics'

describe('netCollected', () => {
  it('subtracts refunds from gross', () => {
    expect(netCollected(10_000, 2_500)).toBe(7_500)
  })
  it('is zero when everything is refunded', () => {
    expect(netCollected(5_000, 5_000)).toBe(0)
  })
  it('can go negative when refunds exceed the period gross', () => {
    // Refunds for an earlier period's sales — must not be silently clamped.
    expect(netCollected(1_000, 3_000)).toBe(-2_000)
  })
})

describe('commissionIncome', () => {
  it('takes the rate off net', () => {
    expect(commissionIncome(10_000, 15)).toBe(1_500)
  })
  it('rounds to whole currency', () => {
    expect(commissionIncome(1_001, 15)).toBe(150)
  })
  it('is zero at a 0% rate', () => {
    expect(commissionIncome(10_000, 0)).toBe(0)
  })

  // The important one: an unset rate must never look like zero income.
  it('returns null for an unset rate', () => {
    expect(commissionIncome(10_000, null)).toBeNull()
  })
  it('distinguishes an unset rate from a 0% rate', () => {
    expect(commissionIncome(10_000, null)).not.toBe(commissionIncome(10_000, 0))
  })
})

describe('buildMoney', () => {
  it('assembles the full breakdown', () => {
    expect(buildMoney(10_000, 2_000, 10)).toEqual({
      grossSales: 10_000,
      refunds: 2_000,
      netCollected: 8_000,
      commissionIncome: 800,
      commissionRate: 10,
    })
  })

  it('charges commission on net, not gross', () => {
    // 10% of 8,000 net = 800, not 10% of 10,000 gross = 1,000.
    expect(buildMoney(10_000, 2_000, 10).commissionIncome).toBe(800)
  })

  it('propagates an unset rate as null commission', () => {
    const m = buildMoney(10_000, 0, null)
    expect(m.commissionIncome).toBeNull()
    expect(m.commissionRate).toBeNull()
    expect(m.netCollected).toBe(10_000)
  })
})

describe('sellThroughRate', () => {
  it.each([
    [50, 100, 50],
    [100, 100, 100],
    [0, 100, 0],
    [33, 100, 33],
  ])('%i of %i offered => %i%%', (sold, offered, expected) => {
    expect(sellThroughRate(sold, offered)).toBe(expected)
  })

  it('returns 0 rather than dividing by zero', () => {
    expect(sellThroughRate(0, 0)).toBe(0)
    expect(sellThroughRate(5, 0)).toBe(0)
  })
})

describe('checkInRate', () => {
  it('is a share of sold, not of capacity', () => {
    expect(checkInRate(45, 90)).toBe(50)
  })
  it('handles no sales', () => {
    expect(checkInRate(0, 0)).toBe(0)
  })
})

describe('averageTicketPrice', () => {
  it('divides net by paid tickets', () => {
    expect(averageTicketPrice(10_000, 20)).toBe(500)
  })
  it('is null with no paid tickets, not zero', () => {
    // Comp-only events have no meaningful average price.
    expect(averageTicketPrice(0, 0)).toBeNull()
  })
})

describe('percentChange', () => {
  it('computes growth', () => {
    expect(percentChange(150, 100)).toBe(50)
  })
  it('computes decline', () => {
    expect(percentChange(50, 100)).toBe(-50)
  })
  it('is null without a baseline', () => {
    expect(percentChange(500, 0)).toBeNull()
  })
})

describe('rankOf', () => {
  it('ranks descending, 1-based', () => {
    expect(rankOf(300, [500, 300, 100])).toBe(2)
    expect(rankOf(500, [500, 300, 100])).toBe(1)
  })
  it('is null with nothing to compare against', () => {
    // "#1 of 1" would read as success on a single-event platform.
    expect(rankOf(500, [500])).toBeNull()
    expect(rankOf(0, [])).toBeNull()
  })
  it('gives ties the same rank', () => {
    expect(rankOf(300, [300, 300, 100])).toBe(1)
  })
})

describe('median', () => {
  it('handles odd counts', () => {
    expect(median([100, 500, 300])).toBe(300)
  })
  it('averages the middle pair on even counts', () => {
    expect(median([100, 200, 300, 400])).toBe(250)
  })
  it('is zero for an empty set', () => {
    expect(median([])).toBe(0)
  })
})

describe('bucketByDay', () => {
  it('counts per calendar day, ascending', () => {
    expect(
      bucketByDay([
        new Date('2026-08-02T10:00:00Z'),
        new Date('2026-08-01T23:00:00Z'),
        new Date('2026-08-02T18:00:00Z'),
      ]),
    ).toEqual([
      { day: '2026-08-01', count: 1 },
      { day: '2026-08-02', count: 2 },
    ])
  })
  it('returns an empty series for no data', () => {
    expect(bucketByDay([])).toEqual([])
  })
})

describe('bucketByHour', () => {
  it('counts per hour, ascending', () => {
    expect(
      bucketByHour([
        new Date('2026-08-01T19:10:00Z'),
        new Date('2026-08-01T19:50:00Z'),
        new Date('2026-08-01T20:05:00Z'),
      ]),
    ).toEqual([
      { hour: '2026-08-01T19:00', count: 2 },
      { hour: '2026-08-01T20:00', count: 1 },
    ])
  })
})

describe('cumulative', () => {
  it('accumulates a running total', () => {
    expect(
      cumulative([
        { day: 'a', count: 2 },
        { day: 'b', count: 3 },
        { day: 'c', count: 5 },
      ]),
    ).toEqual([
      { day: 'a', count: 2, total: 2 },
      { day: 'b', count: 3, total: 5 },
      { day: 'c', count: 5, total: 10 },
    ])
  })
  it('handles an empty series', () => {
    expect(cumulative([])).toEqual([])
  })
})
