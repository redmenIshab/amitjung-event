// Derived, server-computable event availability + sale-state logic.
// Single source of truth used by both the admin and public UIs so the rules
// (what's purchasable, which badge shows) never drift between them.

export const LIMITED_THRESHOLD = 50
export const FILLING_FAST_RATIO = 0.2

export type EventSaleBadge = 'EARLY_BIRD' | 'FILLING_FAST' | 'LIMITED' | 'SOLD_OUT'
export type EventLifecycle = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'LIVE' | 'ENDED'
export type EventStoredStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED'

export interface EventAvailabilityInput {
  status: EventStoredStatus
  isOpen: boolean
  ticketsAvailable: number
  /** The event date / booking cutoff. */
  bookingDeadline: Date | string
  hasDiscount: boolean
  discountUpto: Date | string | null
  /** Count of non-cancelled tickets already issued for this event. */
  soldCount: number
}

export interface EventAvailability {
  remaining: number
  soldOut: boolean
  ended: boolean
  lifecycle: EventLifecycle
  isPurchasable: boolean
  badges: EventSaleBadge[]
}

const ms = (d: Date | string) => new Date(d).getTime()

export function computeEventAvailability(
  e: EventAvailabilityInput,
  now: Date = new Date(),
): EventAvailability {
  const ended = now.getTime() > ms(e.bookingDeadline)
  const remaining = Math.max(0, e.ticketsAvailable - e.soldCount)
  const soldOut = remaining <= 0

  let lifecycle: EventLifecycle
  if (e.status === 'CANCELLED') lifecycle = 'CANCELLED'
  else if (e.status === 'DRAFT') lifecycle = 'DRAFT'
  else if (ended) lifecycle = 'ENDED'
  else lifecycle = 'LIVE'

  const isPurchasable = e.status === 'PUBLISHED' && e.isOpen && !ended && !soldOut

  const badges: EventSaleBadge[] = []
  if (soldOut) {
    badges.push('SOLD_OUT')
  } else {
    if (e.hasDiscount && e.discountUpto && now.getTime() < ms(e.discountUpto)) {
      badges.push('EARLY_BIRD')
    }
    if (e.ticketsAvailable > 0 && remaining / e.ticketsAvailable < FILLING_FAST_RATIO) {
      badges.push('FILLING_FAST')
    }
    if (e.ticketsAvailable <= LIMITED_THRESHOLD) {
      badges.push('LIMITED')
    }
  }

  return { remaining, soldOut, ended, lifecycle, isPurchasable, badges }
}

/** Whether an event belongs on the public listing (published and not yet past). */
export function isPubliclyVisible(
  e: { status: EventStoredStatus; bookingDeadline: Date | string },
  now: Date = new Date(),
): boolean {
  return e.status === 'PUBLISHED' && now.getTime() <= ms(e.bookingDeadline)
}

/** Human-readable label for why an event cannot be purchased (or null if it can). */
export function purchaseBlockedReason(a: EventAvailability): string | null {
  if (a.isPurchasable) return null
  if (a.lifecycle === 'CANCELLED') return 'This event has been cancelled'
  if (a.lifecycle === 'DRAFT') return 'This event is not on sale yet'
  if (a.ended) return 'Ticket sales have closed'
  if (a.soldOut) return 'Sold out'
  return 'Tickets are not available'
}
