import type { Session } from 'next-auth'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasCapability, type Capability } from '@/lib/rbac'
import { canAccessEvent, isEventScopedRole } from '@/lib/eventScope'

/**
 * Database-backed event scoping.
 *
 * Lives apart from `rbac.ts` on purpose: that module is bundled into the edge
 * proxy and into client components, so it can never import Prisma. Everything
 * here is server-only and is the AUTHORITY on scope — the ids in the JWT are a
 * fast path for the edge and may be seconds stale, so these helpers re-read the
 * assignment rows rather than trusting the token.
 */

/** Event ids a user is assigned to. Empty array when unassigned. */
export async function assignedEventIds(userId: string): Promise<string[]> {
  const rows = await prisma.eventAssignment.findMany({
    where: { userId },
    select: { eventId: true },
  })
  return rows.map((r) => r.eventId)
}

/**
 * Which events this session may see.
 *
 * `null` means "all of them" — the caller should apply no filter at all.
 * Returning `null` rather than every id keeps list queries cheap for staff and
 * makes the unfiltered case explicit at each call site.
 */
export async function visibleEventIds(session: Session): Promise<string[] | null> {
  if (!isEventScopedRole(session.user.role)) return null
  return assignedEventIds(session.user.id)
}

type GateResult =
  | { session: Session }
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'OUT_OF_SCOPE'

/** Resolves the caller and checks capability + event scope in one step. */
async function gate(cap: Capability, eventId: string): Promise<GateResult> {
  const session = await getServerSession(authOptions)
  if (!session) return 'UNAUTHENTICATED'
  if (!hasCapability(session.user.role, cap)) return 'FORBIDDEN'

  if (isEventScopedRole(session.user.role)) {
    const ids = await assignedEventIds(session.user.id)
    if (!canAccessEvent(session.user.role, ids, eventId)) return 'OUT_OF_SCOPE'
  }

  return { session }
}

/**
 * Route-handler gate for a capability against one event.
 *
 * Pattern mirrors `requireApiCapability`:
 *   const g = await requireEventApiCapability('EVENT_READ', eventId)
 *   if (g instanceof NextResponse) return g
 *
 * Out-of-scope returns 403 with the same body as a capability failure, so a
 * probing organizer cannot use the status code to learn which event ids exist.
 */
export async function requireEventApiCapability(
  cap: Capability,
  eventId: string,
): Promise<{ session: Session } | NextResponse> {
  const result = await gate(cap, eventId)
  if (result === 'UNAUTHENTICATED')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (result === 'FORBIDDEN' || result === 'OUT_OF_SCOPE')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return result
}

/**
 * Server-component gate for a capability against one event.
 *
 * An out-of-scope organizer goes to their own event list rather than the public
 * site — they are legitimately signed in, just looking at the wrong event.
 */
export async function requireEventPageCapability(
  cap: Capability,
  eventId: string,
): Promise<Session> {
  const result = await gate(cap, eventId)
  if (result === 'UNAUTHENTICATED') redirect('/admin/login')
  if (result === 'OUT_OF_SCOPE') redirect('/admin/events')
  if (result === 'FORBIDDEN') redirect('/')
  return (result as { session: Session }).session
}
