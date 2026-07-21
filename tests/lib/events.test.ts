import { describe, it, expect } from 'vitest'
import {
  computeEventAvailability,
  isPubliclyVisible,
  purchaseBlockedReason,
  type EventAvailabilityInput,
} from '@/lib/events'

const NOW = new Date('2026-07-21T12:00:00Z')
const FUTURE = '2026-12-01T20:00:00Z'
const PAST = '2026-01-01T20:00:00Z'

function base(overrides: Partial<EventAvailabilityInput> = {}): EventAvailabilityInput {
  return {
    status: 'PUBLISHED',
    isOpen: true,
    ticketsAvailable: 100,
    bookingDeadline: FUTURE,
    hasDiscount: false,
    discountUpto: null,
    soldCount: 0,
    ...overrides,
  }
}

describe('computeEventAvailability', () => {
  it('published, future, tickets left → purchasable, no scarcity badges', () => {
    const a = computeEventAvailability(base(), NOW)
    expect(a.isPurchasable).toBe(true)
    expect(a.remaining).toBe(100)
    expect(a.lifecycle).toBe('LIVE')
    expect(a.badges).toEqual([])
  })

  it('sold out when soldCount >= ticketsAvailable', () => {
    const a = computeEventAvailability(base({ ticketsAvailable: 20, soldCount: 20 }), NOW)
    expect(a.soldOut).toBe(true)
    expect(a.remaining).toBe(0)
    expect(a.isPurchasable).toBe(false)
    expect(a.badges).toEqual(['SOLD_OUT'])
  })

  it('filling fast when <20% remain', () => {
    const a = computeEventAvailability(base({ ticketsAvailable: 100, soldCount: 85 }), NOW)
    expect(a.remaining).toBe(15)
    expect(a.badges).toContain('FILLING_FAST')
  })

  it('limited when offered inventory <= threshold', () => {
    const a = computeEventAvailability(base({ ticketsAvailable: 40, soldCount: 0 }), NOW)
    expect(a.badges).toContain('LIMITED')
  })

  it('early bird while within discount window', () => {
    const a = computeEventAvailability(
      base({ hasDiscount: true, discountUpto: FUTURE }),
      NOW,
    )
    expect(a.badges).toContain('EARLY_BIRD')
  })

  it('no early bird once discount window passed', () => {
    const a = computeEventAvailability(
      base({ hasDiscount: true, discountUpto: PAST }),
      NOW,
    )
    expect(a.badges).not.toContain('EARLY_BIRD')
  })

  it('ended when past booking deadline', () => {
    const a = computeEventAvailability(base({ bookingDeadline: PAST }), NOW)
    expect(a.ended).toBe(true)
    expect(a.lifecycle).toBe('ENDED')
    expect(a.isPurchasable).toBe(false)
  })

  it('draft is never purchasable and reports DRAFT lifecycle', () => {
    const a = computeEventAvailability(base({ status: 'DRAFT' }), NOW)
    expect(a.lifecycle).toBe('DRAFT')
    expect(a.isPurchasable).toBe(false)
  })

  it('cancelled is never purchasable', () => {
    const a = computeEventAvailability(base({ status: 'CANCELLED' }), NOW)
    expect(a.lifecycle).toBe('CANCELLED')
    expect(a.isPurchasable).toBe(false)
  })

  it('closed (isOpen=false) is not purchasable even if published & in stock', () => {
    const a = computeEventAvailability(base({ isOpen: false }), NOW)
    expect(a.isPurchasable).toBe(false)
  })
})

describe('isPubliclyVisible', () => {
  it('published future event is visible', () => {
    expect(isPubliclyVisible({ status: 'PUBLISHED', bookingDeadline: FUTURE }, NOW)).toBe(true)
  })
  it('draft is hidden', () => {
    expect(isPubliclyVisible({ status: 'DRAFT', bookingDeadline: FUTURE }, NOW)).toBe(false)
  })
  it('ended published event is hidden', () => {
    expect(isPubliclyVisible({ status: 'PUBLISHED', bookingDeadline: PAST }, NOW)).toBe(false)
  })
})

describe('purchaseBlockedReason', () => {
  it('null when purchasable', () => {
    const a = computeEventAvailability(base(), NOW)
    expect(purchaseBlockedReason(a)).toBeNull()
  })
  it('sold out reason', () => {
    const a = computeEventAvailability(base({ ticketsAvailable: 1, soldCount: 1 }), NOW)
    expect(purchaseBlockedReason(a)).toBe('Sold out')
  })
  it('ended reason', () => {
    const a = computeEventAvailability(base({ bookingDeadline: PAST }), NOW)
    expect(purchaseBlockedReason(a)).toBe('Ticket sales have closed')
  })
})
