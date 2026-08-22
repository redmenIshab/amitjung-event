import type { AppRole, Capability } from '@/lib/rbac'

/**
 * Event scoping — the second authorization dimension.
 *
 * `rbac.ts` answers "may this role do X?". This module answers "…to THIS
 * event?". It is deliberately pure and dependency-free: the edge proxy, the
 * server gates and client components all import it, so it can hold no Prisma,
 * no `next/headers`, and no session lookup.
 */

/**
 * Capabilities that mean nothing without an event id. Granting one of these to
 * a scoped role is a grant *per assigned event*, never platform-wide.
 */
export const EVENT_SCOPED_CAPABILITIES: ReadonlySet<Capability> = new Set([
  'EVENT_READ',
  'ANALYTICS_READ',
  'TICKET_SCAN',
  'SALES_READ',
])

/**
 * Roles whose capabilities are confined to their assigned events.
 *
 * The one place a role string is compared directly — this IS the definition of
 * the scoped set, not a feature-level check.
 */
export function isEventScopedRole(role: AppRole | undefined): boolean {
  return role === 'ORGANIZER'
}

/**
 * Whether `role` may act on `eventId`.
 *
 * Unscoped staff roles (ADMIN/STAFF/MANAGER) pass regardless of the assignment
 * list — they see the whole platform. Scoped roles must have the event in their
 * assignments. Capability itself is checked separately by `hasCapability`; this
 * answers only the "which event" half.
 */
export function canAccessEvent(
  role: AppRole | undefined,
  assignedEventIds: readonly string[] | undefined,
  eventId: string,
): boolean {
  if (!eventId) return false
  if (!isEventScopedRole(role)) return true
  return (assignedEventIds ?? []).includes(eventId)
}
