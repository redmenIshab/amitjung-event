import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { hasCapability } from '@/lib/rbac'
import { canAccessEvent, isEventScopedRole } from '@/lib/eventScope'

/** Where a blocked organizer lands. Must be a path they are allowed, or this loops. */
const ORGANIZER_HOME = '/admin/events'

/**
 * Areas an event-scoped role may never enter, whatever event is involved.
 * Written as path patterns because the edge cannot resolve capabilities per
 * page — the page gates remain the authority.
 */
const ORGANIZER_DENIED = [
  /^\/admin\/users(\/|$)/,
  /^\/admin\/artists(\/|$)/,
  /^\/admin\/events\/new$/,
  /^\/admin\/events\/[^/]+\/edit(\/|$)/,
  /^\/admin\/events\/[^/]+\/tickets\/new(\/|$)/,
]

/** `/admin/events/<id>...` → `<id>`, else null. `new` is not an id. */
function eventIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/admin\/events\/([^/]+)/)
  if (!match || match[1] === 'new') return null
  return match[1]
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // The admin login page must stay public, otherwise the guard loops on it.
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  // JWT.role is typed as AppRole in next-auth.d.ts — no cast needed.
  if (!token || !hasCapability(token.role, 'DASHBOARD_VIEW')) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // ── Event-scoped roles ────────────────────────────────────────────────────
  // Coarse, and only as fresh as the token: an assignment revoked seconds ago
  // may still pass here. requireEventPageCapability re-reads the database and
  // is the authority — same posture as role revocation (ARCHITECTURE §6).
  if (isEventScopedRole(token.role)) {
    if (ORGANIZER_DENIED.some((re) => re.test(pathname))) {
      return NextResponse.redirect(new URL(ORGANIZER_HOME, request.url))
    }
    const eventId = eventIdFromPath(pathname)
    if (eventId && !canAccessEvent(token.role, token.eventIds, eventId)) {
      return NextResponse.redirect(new URL(ORGANIZER_HOME, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
