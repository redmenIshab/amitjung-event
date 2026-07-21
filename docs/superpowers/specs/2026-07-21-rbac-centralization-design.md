# RBAC Centralization (P0) — Design

**Date:** 2026-07-21
**Status:** Approved, pending implementation plan
**Branch:** off `origin/dev` (the RBAC WIP lives there)

## Goal

Replace the scattered, drift-prone role checks in the admin/ticketing code with
a single source of truth: one `rbac.ts` module (capabilities → roles) consumed
by every server component, API route, and a restored edge backstop. Formalize
the approved 3-tier role matrix, make the front end hide controls a role can't
use, and remove the duplicated inline role arrays and `as` casts.

## Context (current state on `origin/dev`)

The `dev` branch already improved on `main`: the admin `layout.tsx` now checks
role (not just presence), and `verify` / `analytics` / `tickets` GET now check
roles. But each check re-declares its own inline array
(`ADMIN_ROLES = ['ADMIN','STAFF','MANAGER']`, `SCANNER_ROLES = ['ADMIN','STAFF']`)
with `as typeof X[number]` casts, and `src/proxy.ts` (the Next 16 middleware)
was **deleted** — removing the only edge backstop. This design consolidates all
of that.

Not changing: `User.role` still defaults to `STAFF` (no schema migration — the
approved decision). Participant auth remains NextAuth + the `Participant` model.

## Approved role → capability matrix

| Capability | ADMIN | STAFF | MANAGER | Notes |
|---|:-:|:-:|:-:|---|
| `DASHBOARD_VIEW` | ✓ | ✓ | ✓ | Admin UI shell, event/ticket lists |
| `ANALYTICS_READ` | ✓ | ✓ | ✓ | Reports / analytics endpoints |
| `TICKET_SCAN` | ✓ | ✓ | — | Check-in / verify |
| `EVENT_WRITE` | ✓ | — | — | Create / update / delete events |
| `TICKET_MANAGE` | ✓ | — | — | Issue / bulk / distributor / send-PDF |
| `ARTIST_MANAGE` | ✓ | — | — | Artist + music CRUD |
| `USER_MANAGE` | ✓ | — | — | Reserved for future user/role admin |

`PARTICIPANT` / `USER` roles have none of these capabilities (participant
routes use `requireSession`, not a capability). Deliberate, documented change:
admin **read** endpoints that were ADMIN-only on `dev` (e.g. artist GET) move to
`DASHBOARD_VIEW` so STAFF/MANAGER can view, matching the matrix.

## Architecture

### 1. `src/lib/rbac.ts` — single source of truth

```ts
import type { Session } from 'next-auth'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export type AppRole = Session['user']['role'] // ADMIN|STAFF|MANAGER|USER|PARTICIPANT

export const CAPABILITY = {
  DASHBOARD_VIEW: ['ADMIN', 'STAFF', 'MANAGER'],
  ANALYTICS_READ: ['ADMIN', 'STAFF', 'MANAGER'],
  TICKET_SCAN:    ['ADMIN', 'STAFF'],
  EVENT_WRITE:    ['ADMIN'],
  TICKET_MANAGE:  ['ADMIN'],
  ARTIST_MANAGE:  ['ADMIN'],
  USER_MANAGE:    ['ADMIN'],
} as const satisfies Record<string, readonly AppRole[]>

export type Capability = keyof typeof CAPABILITY

// Pure predicate — no casts, `role` is already the typed union.
export function hasCapability(role: AppRole | undefined, cap: Capability): boolean {
  return role !== undefined && (CAPABILITY[cap] as readonly AppRole[]).includes(role)
}

// For API route handlers. Returns the session, or a NextResponse to return as-is.
export async function requireApiCapability(
  cap: Capability,
): Promise<{ session: Session } | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasCapability(session.user.role, cap))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { session }
}

// For server components / pages. Redirects instead of returning a response.
export async function requirePageCapability(cap: Capability): Promise<Session> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!hasCapability(session.user.role, cap)) redirect('/')
  return session
}

// For participant-facing routes (authenticated, any role). 401 if no session.
export async function requireSession(): Promise<{ session: Session } | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return { session }
}
```

**Call-site shapes:**

```ts
// API route
const gate = await requireApiCapability('EVENT_WRITE')
if (gate instanceof NextResponse) return gate
const { session } = gate
// ... proceed

// Server component / layout
const session = await requirePageCapability('DASHBOARD_VIEW')

// Participant route
const gate = await requireSession()
if (gate instanceof NextResponse) return gate
const { session } = gate
```

### 2. `src/proxy.ts` — restored minimal backstop

```ts
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { hasCapability } from '@/lib/rbac'

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  // JWT.role is typed as AppRole in next-auth.d.ts — no cast needed.
  if (!token || !hasCapability(token.role, 'DASHBOARD_VIEW')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

Matches `/admin/:path*` only. API namespaces are mixed public/admin
(`GET /api/events`, `register`, `khalti` are public), so they stay guarded
in-handler by `requireApiCapability`. The backstop is defense-in-depth for the
admin UI; the layout still applies its own `requirePageCapability`.

### 3. Refactor all call sites → helper

| File | Verb | Capability |
|---|---|---|
| `admin/layout.tsx` | (page) | `DASHBOARD_VIEW` |
| `admin/dashboard/page.tsx` | (page) | `DASHBOARD_VIEW` (via layout; keep session read) |
| `api/events/route.ts` | POST | `EVENT_WRITE` |
| `api/events/[eventId]/route.ts` | PATCH, DELETE | `EVENT_WRITE` |
| `api/events/[eventId]/analytics/route.ts` | GET | `ANALYTICS_READ` |
| `api/events/[eventId]/tickets/route.ts` | GET | `DASHBOARD_VIEW` |
| `api/events/[eventId]/tickets/route.ts` | POST | `TICKET_MANAGE` |
| `api/events/[eventId]/tickets/bulk/route.ts` | POST | `TICKET_MANAGE` |
| `api/events/[eventId]/tickets/distributor/route.ts` | POST | `TICKET_MANAGE` |
| `api/events/[eventId]/tickets/[ticketId]/send-pdf/route.ts` | POST | `TICKET_MANAGE` |
| `api/verify/[token]/route.ts` | POST | `TICKET_SCAN` |
| `api/artist/route.ts` | GET | `DASHBOARD_VIEW` |
| `api/artist/route.ts` | POST | `ARTIST_MANAGE` |
| `api/artist/[artistId]/route.ts` | GET / PATCH / DELETE | `DASHBOARD_VIEW` / `ARTIST_MANAGE` / `ARTIST_MANAGE` |
| `api/artist/[artistId]/music/route.ts` | GET / POST | `DASHBOARD_VIEW` / `ARTIST_MANAGE` |
| `api/artist/[artistId]/music/[musicId]/route.ts` | GET / PATCH / DELETE | `DASHBOARD_VIEW` / `ARTIST_MANAGE` / `ARTIST_MANAGE` |
| `api/tickets/mine/route.ts` | GET | `requireSession` |
| `api/tickets/mine/[eventId]/route.ts` | GET | `requireSession` |
| `api/tickets/mine/[eventId]/[ticketId]/route.ts` | GET | `requireSession` |

Public routes unchanged (no auth): `GET /api/events`, `GET /api/events/[eventId]`,
`register/[eventId]`, `khalti/initiate`, `khalti/callback`.

After the refactor, no file declares its own role array and no `as typeof
X[number]` cast remains outside `rbac.ts`.

### 4. Front-end control gating

Admin pages that render mutate controls check `hasCapability(session.user.role, …)`
so STAFF/MANAGER never see a button that 403s:

- `admin/events/page.tsx` — "New Event" behind `EVENT_WRITE` (already partly done).
- `admin/events/[eventId]/page.tsx` — edit/delete controls behind `EVENT_WRITE`.
- `admin/events/[eventId]/tickets/new/page.tsx` — behind `TICKET_MANAGE`.
- `admin/events/new/page.tsx` — behind `EVENT_WRITE` (redirect non-writers).
- `admin/artists/*` create/edit/delete controls — behind `ARTIST_MANAGE`.

### 5. Cleanups included

- Revert the `dev` regression in `src/lib/auth.ts`: `(profile as any)?.picture`
  → the typed `(profile as { picture?: string } | undefined)?.picture ?? ''`.
- Add `docs/rbac-matrix.md` — the role×capability matrix in prose as the
  human-readable policy that `CAPABILITY` implements.

## Out of scope (separate specs)

- `stress/*` production hardening (env-gate + constant-time key). Follow-up.
- Khalti payment integrity review (P3).
- Any schema/role-enum change (`STAFF` default stays).
- Participant auth expansion / account portal (P2).

## Testing

Security-critical, so behavior is tested, not assumed:

- **Unit** (`vitest`): `hasCapability` truth table — every role × every
  capability asserts the exact matrix above (including `PARTICIPANT`/`USER` →
  all false, and `undefined` role → false).
- **Route-level**: for a representative mutating route (`POST /api/events`) and a
  scan route (`POST /api/verify/[token]`), assert `401` with no session, `403`
  for a role lacking the capability, and pass-through for an allowed role — by
  mocking `getServerSession`.

## Success criteria

- `src/lib/rbac.ts` is the only place role→capability policy is defined.
- Every admin/participant route and the admin layout enforce access through the
  helpers; grep finds no inline role arrays or `as typeof` role casts outside
  `rbac.ts`.
- `src/proxy.ts` redirects unauthenticated / under-privileged requests to
  `/admin/*`.
- STAFF/MANAGER can view the dashboard but see no mutate controls and receive
  `403` from mutating APIs.
- `hasCapability` unit tests and the route-level auth tests pass.
- Lyante app builds and typechecks with no new errors.
