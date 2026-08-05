import type { Session } from 'next-auth'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export type AppRole = Session['user']['role']

export const CAPABILITY = {
  DASHBOARD_VIEW: ['ADMIN', 'STAFF', 'MANAGER'],
  ANALYTICS_READ: ['ADMIN', 'STAFF', 'MANAGER'],
  TICKET_SCAN: ['ADMIN', 'STAFF'],
  EVENT_WRITE: ['ADMIN'],
  TICKET_MANAGE: ['ADMIN'],
  ARTIST_MANAGE: ['ADMIN'],
  MARKETING_MANAGE: ['ADMIN', 'MANAGER'],
  USER_MANAGE: ['ADMIN'],
  // Money: revenue, refunds, commission rates and margin. Deliberately
  // narrower than ANALYTICS_READ — door staff need check-in numbers, not
  // organizer commercial terms.
  FINANCE_READ: ['ADMIN'],
} as const satisfies Record<string, readonly AppRole[]>

export type Capability = keyof typeof CAPABILITY

export function hasCapability(role: AppRole | undefined, cap: Capability): boolean {
  return role !== undefined && (CAPABILITY[cap] as readonly AppRole[]).includes(role)
}

export async function requireApiCapability(
  cap: Capability,
): Promise<{ session: Session } | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasCapability(session.user.role, cap))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { session }
}

export async function requirePageCapability(cap: Capability): Promise<Session> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/admin/login')
  if (!hasCapability(session.user.role, cap)) redirect('/')
  return session
}

/**
 * Any authenticated caller — the website's NextAuth cookie, or the mobile app's
 * `Authorization: Bearer` token.
 *
 * The cookie is tried first so website behaviour is completely unchanged; the
 * bearer path only runs when there is no cookie session. A bearer token always
 * resolves to PARTICIPANT and never to a staff role, and note that
 * `requireApiCapability` above does NOT consult bearer tokens at all — so the
 * mobile surface is limited to buyer endpoints by construction, and a leaked
 * app token can never reach the Control Center.
 */
export async function requireSession(
  /**
   * Pass the handler's Request to also accept a mobile bearer token. Omitted,
   * only the website cookie is considered — so a route opts in to mobile access
   * explicitly rather than by accident.
   *
   * Imported lazily: this module is also pulled into middleware and client
   * bundles (proxy.ts, hasCapability), and keeping `jose` out of those is worth
   * the dynamic import.
   */
  request?: Request,
): Promise<{ session: Session } | NextResponse> {
  const session = await getServerSession(authOptions)
  if (session) return { session }

  if (request) {
    const { sessionFromBearer } = await import('@/lib/mobileAuth')
    const mobile = await sessionFromBearer(request)
    if (mobile) return { session: mobile }
  }

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
