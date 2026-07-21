# RBAC Centralization (P0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every scattered inline role check in the admin/ticketing code with a single `src/lib/rbac.ts` capability module, restore a `/admin/*` middleware backstop, and gate front-end mutate controls — so role→capability policy lives in exactly one place.

**Architecture:** One `rbac.ts` exports a `CAPABILITY` map (capability → allowed roles), a pure `hasCapability` predicate, and three session guards (`requireApiCapability` for routes, `requirePageCapability` for server components, `requireSession` for participant routes). All ~15 call sites and a restored `src/proxy.ts` consume it. NextAuth + Prisma `Participant` model unchanged; no schema/role-enum migration.

**Tech Stack:** Next.js 16, NextAuth (JWT sessions), TypeScript, Vitest.

## Global Constraints

- Base branch: `origin/dev` (holds the RBAC/ticketing WIP). Do all work in a worktree off `origin/dev`.
- Role→capability matrix (exact): `DASHBOARD_VIEW`,`ANALYTICS_READ` = `[ADMIN,STAFF,MANAGER]`; `TICKET_SCAN` = `[ADMIN,STAFF]`; `EVENT_WRITE`,`TICKET_MANAGE`,`ARTIST_MANAGE`,`USER_MANAGE` = `[ADMIN]`.
- No schema change: `User.role` stays `@default(STAFF)`.
- After the refactor, no file outside `src/lib/rbac.ts` may declare a role array or use an `as typeof X[number]` role cast.
- Admin read endpoints (artist GET) broaden to `DASHBOARD_VIEW` deliberately.
- Public routes stay unauthenticated: `GET /api/events`, `GET /api/events/[eventId]`, `register/[eventId]`, `khalti/initiate`, `khalti/callback`.
- Preserve existing error contract: `401 {error:'Unauthorized'}` unauthenticated, `403 {error:'Forbidden'}` under-privileged.
- Run unit tests with `pnpm test:run`; typecheck with `pnpm exec tsc --noEmit`; build with `pnpm exec next build` (NOT `pnpm build`, which runs `prisma migrate deploy` against the live DB).

---

### Task 1: `src/lib/rbac.ts` — capability module (TDD)

**Files:**
- Create: `src/lib/rbac.ts`
- Test: `tests/lib/rbac.test.ts`

**Interfaces:**
- Produces: `type AppRole`, `const CAPABILITY`, `type Capability`, `hasCapability(role: AppRole | undefined, cap: Capability): boolean`, `requireApiCapability(cap): Promise<{session: Session} | NextResponse>`, `requirePageCapability(cap): Promise<Session>`, `requireSession(): Promise<{session: Session} | NextResponse>`.

- [ ] **Step 1: Write the failing test**

Create `tests/lib/rbac.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const mockGetServerSession = vi.hoisted(() => vi.fn())
vi.mock('next-auth/next', () => ({ getServerSession: mockGetServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { hasCapability, requireApiCapability } from '@/lib/rbac'
import type { AppRole, Capability } from '@/lib/rbac'

describe('hasCapability', () => {
  const cases: [AppRole, Capability, boolean][] = [
    ['ADMIN', 'EVENT_WRITE', true],
    ['STAFF', 'EVENT_WRITE', false],
    ['MANAGER', 'EVENT_WRITE', false],
    ['ADMIN', 'TICKET_SCAN', true],
    ['STAFF', 'TICKET_SCAN', true],
    ['MANAGER', 'TICKET_SCAN', false],
    ['MANAGER', 'ANALYTICS_READ', true],
    ['MANAGER', 'DASHBOARD_VIEW', true],
    ['PARTICIPANT', 'DASHBOARD_VIEW', false],
    ['USER', 'DASHBOARD_VIEW', false],
  ]
  it.each(cases)('%s + %s => %s', (role, cap, expected) => {
    expect(hasCapability(role, cap)).toBe(expected)
  })
  it('undefined role => false', () => {
    expect(hasCapability(undefined, 'DASHBOARD_VIEW')).toBe(false)
  })
})

describe('requireApiCapability', () => {
  beforeEach(() => mockGetServerSession.mockReset())
  it('401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const r = await requireApiCapability('EVENT_WRITE')
    expect(r).toBeInstanceOf(NextResponse)
    expect((r as NextResponse).status).toBe(401)
  })
  it('403 when role lacks capability', async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: 'STAFF' } })
    const r = await requireApiCapability('EVENT_WRITE')
    expect(r).toBeInstanceOf(NextResponse)
    expect((r as NextResponse).status).toBe(403)
  })
  it('returns session when allowed', async () => {
    const session = { user: { role: 'ADMIN' } }
    mockGetServerSession.mockResolvedValue(session)
    const r = await requireApiCapability('EVENT_WRITE')
    expect(r).not.toBeInstanceOf(NextResponse)
    expect((r as { session: unknown }).session).toBe(session)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/lib/rbac.test.ts`
Expected: FAIL — cannot resolve `@/lib/rbac`.

- [ ] **Step 3: Implement `src/lib/rbac.ts`**

```ts
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
  USER_MANAGE: ['ADMIN'],
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
  if (!session) redirect('/login')
  if (!hasCapability(session.user.role, cap)) redirect('/')
  return session
}

export async function requireSession(): Promise<{ session: Session } | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return { session }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/lib/rbac.test.ts`
Expected: PASS (all `hasCapability` cases + 3 `requireApiCapability` cases).

- [ ] **Step 5: Typecheck & commit**

Run: `pnpm exec tsc --noEmit` → no errors.
```bash
git add src/lib/rbac.ts tests/lib/rbac.test.ts
git commit -m "feat(rbac): add central capability module + tests"
```

---

### Task 2: Restore `src/proxy.ts` backstop (TDD)

**Files:**
- Create: `src/proxy.ts`
- Test: `tests/proxy.test.ts`

**Interfaces:**
- Consumes: `hasCapability` from `@/lib/rbac`.
- Produces: `proxy(request)` + `config.matcher = ['/admin/:path*']`.

- [ ] **Step 1: Write the failing test**

Create `tests/proxy.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetToken = vi.hoisted(() => vi.fn())
vi.mock('next-auth/jwt', () => ({ getToken: mockGetToken }))

import { proxy } from '@/proxy'

const req = (path = '/admin/dashboard') => new NextRequest(new URL('http://localhost' + path))

describe('proxy backstop', () => {
  beforeEach(() => mockGetToken.mockReset())
  it('redirects to /login when no token', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await proxy(req())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })
  it('redirects when role lacks DASHBOARD_VIEW', async () => {
    mockGetToken.mockResolvedValue({ role: 'PARTICIPANT' })
    const res = await proxy(req())
    expect(res.headers.get('location')).toContain('/login')
  })
  it('passes through for STAFF', async () => {
    mockGetToken.mockResolvedValue({ role: 'STAFF' })
    const res = await proxy(req())
    expect(res.headers.get('location')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:run tests/proxy.test.ts`
Expected: FAIL — cannot resolve `@/proxy`.

- [ ] **Step 3: Implement `src/proxy.ts`**

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

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:run tests/proxy.test.ts`
Expected: PASS (3 cases).

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts tests/proxy.test.ts
git commit -m "feat(rbac): restore /admin/* proxy backstop via capability check"
```

---

### Task 3: Refactor event / ticket / analytics / verify API routes

Each handler's inline auth block becomes a `requireApiCapability` gate. Where a handler doesn't use `session` afterward (all of these), do **not** destructure it; just guard on the gate. Remove now-unused imports (`getServerSession`, `authOptions`) and any inline `ADMIN_ROLES`/`SCANNER_ROLES` constant. Keep the `NextResponse` and other imports.

**Files (all Modify):**
- `src/app/api/events/route.ts`
- `src/app/api/events/[eventId]/route.ts`
- `src/app/api/events/[eventId]/analytics/route.ts`
- `src/app/api/events/[eventId]/tickets/route.ts`
- `src/app/api/events/[eventId]/tickets/bulk/route.ts`
- `src/app/api/events/[eventId]/tickets/distributor/route.ts`
- `src/app/api/events/[eventId]/tickets/[ticketId]/send-pdf/route.ts`
- `src/app/api/verify/[token]/route.ts`

**Interfaces:**
- Consumes: `requireApiCapability` from `@/lib/rbac`.

- [ ] **Step 1: `events/route.ts` (POST → EVENT_WRITE)**

Replace imports lines 2–3:
```ts
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
```
with:
```ts
import { requireApiCapability } from '@/lib/rbac'
```
Replace the POST auth block:
```ts
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
```
with:
```ts
    const gate = await requireApiCapability('EVENT_WRITE')
    if (gate instanceof NextResponse) return gate
```

- [ ] **Step 2: `events/[eventId]/route.ts` (PATCH, DELETE → EVENT_WRITE)**

Swap imports (lines 2–3) to `import { requireApiCapability } from '@/lib/rbac'`. Replace **both** the PATCH and DELETE auth blocks (identical text):
```ts
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
```
each with:
```ts
  const gate = await requireApiCapability('EVENT_WRITE')
  if (gate instanceof NextResponse) return gate
```

- [ ] **Step 3: `events/[eventId]/analytics/route.ts` (GET → ANALYTICS_READ)**

Swap imports (lines 2–3) to `import { requireApiCapability } from '@/lib/rbac'`. Delete the inline constant `const ADMIN_ROLES = ['ADMIN', 'STAFF', 'MANAGER'] as const`. Replace the auth block:
```ts
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN_ROLES.includes(session.user.role as typeof ADMIN_ROLES[number])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
```
with:
```ts
  const gate = await requireApiCapability('ANALYTICS_READ')
  if (gate instanceof NextResponse) return gate
```

- [ ] **Step 4: `events/[eventId]/tickets/route.ts` (GET → DASHBOARD_VIEW, POST → TICKET_MANAGE)**

Swap imports (lines 2–3) to `import { requireApiCapability } from '@/lib/rbac'`. Delete the inline `const ADMIN_ROLES = ['ADMIN', 'STAFF', 'MANAGER'] as const`. Replace the **GET** block:
```ts
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN_ROLES.includes(session.user.role as typeof ADMIN_ROLES[number])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
```
with:
```ts
  const gate = await requireApiCapability('DASHBOARD_VIEW')
  if (gate instanceof NextResponse) return gate
```
Replace the **POST** block:
```ts
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
```
with:
```ts
  const gate = await requireApiCapability('TICKET_MANAGE')
  if (gate instanceof NextResponse) return gate
```

- [ ] **Step 5: `tickets/bulk`, `tickets/distributor`, `tickets/[ticketId]/send-pdf` (POST → TICKET_MANAGE)**

In each of the three files, swap imports (lines 2–3) to `import { requireApiCapability } from '@/lib/rbac'`, and replace the POST auth block:
```ts
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
```
with:
```ts
  const gate = await requireApiCapability('TICKET_MANAGE')
  if (gate instanceof NextResponse) return gate
```

- [ ] **Step 6: `verify/[token]/route.ts` (POST → TICKET_SCAN)**

Swap imports (lines 2–3) to `import { requireApiCapability } from '@/lib/rbac'`. Delete `const SCANNER_ROLES = ['ADMIN', 'STAFF'] as const`. Replace:
```ts
  const session = await getServerSession(authOptions)
  if (!session || !SCANNER_ROLES.includes(session.user.role as typeof SCANNER_ROLES[number])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
```
with:
```ts
  const gate = await requireApiCapability('TICKET_SCAN')
  if (gate instanceof NextResponse) return gate
```

- [ ] **Step 7: Verify & commit**

Run: `pnpm exec tsc --noEmit` → no errors (watch for now-unused `session`/import warnings; if `tsc` flags an unused import that survived, remove it).
Run: `pnpm test:run` → existing suite + Tasks 1–2 pass.
```bash
git add src/app/api/events src/app/api/verify
git commit -m "refactor(rbac): route event/ticket/verify APIs through requireApiCapability"
```

---

### Task 4: Refactor artist API routes

Reads (GET) → `DASHBOARD_VIEW`; writes (POST/PATCH/DELETE) → `ARTIST_MANAGE`. Same mechanical swap: imports (lines 2–3) → `import { requireApiCapability } from '@/lib/rbac'`; each block `const session = await getServerSession(authOptions); if (!session || session.user.role !== 'ADMIN') { return NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }` → the gate for that verb.

**Files (all Modify):**
- `src/app/api/artist/route.ts` — GET → `DASHBOARD_VIEW`, POST → `ARTIST_MANAGE`
- `src/app/api/artist/[artistId]/route.ts` — GET → `DASHBOARD_VIEW`, PATCH/DELETE → `ARTIST_MANAGE`
- `src/app/api/artist/[artistId]/music/route.ts` — GET → `DASHBOARD_VIEW`, POST → `ARTIST_MANAGE`
- `src/app/api/artist/[artistId]/music/[musicId]/route.ts` — GET → `DASHBOARD_VIEW`, PATCH/DELETE → `ARTIST_MANAGE`

**Interfaces:** Consumes `requireApiCapability` from `@/lib/rbac`.

- [ ] **Step 1: GET handlers → DASHBOARD_VIEW**

In each file, replace the GET handler's auth block with:
```ts
  const gate = await requireApiCapability('DASHBOARD_VIEW')
  if (gate instanceof NextResponse) return gate
```
(For `music/route.ts` and `music/[musicId]/route.ts` the blocks are indented one level deeper inside a `try` — preserve the existing indentation.)

- [ ] **Step 2: Write handlers (POST/PATCH/DELETE) → ARTIST_MANAGE**

In each file, replace every write handler's auth block with:
```ts
  const gate = await requireApiCapability('ARTIST_MANAGE')
  if (gate instanceof NextResponse) return gate
```
(Preserve the deeper indentation in the `music/*` files.)

- [ ] **Step 3: Swap imports & remove unused**

In all four files, replace imports lines 2–3 with `import { requireApiCapability } from '@/lib/rbac'`. Ensure `NextResponse` remains imported.

- [ ] **Step 4: Verify & commit**

Run: `pnpm exec tsc --noEmit` → no errors.
```bash
git add src/app/api/artist
git commit -m "refactor(rbac): route artist APIs through requireApiCapability"
```

---

### Task 5: Refactor participant `tickets/mine` routes

These stay authenticated-any-role but now go through `requireSession`. They **use** `session` afterward (`session.user.id`, `session.user.email`), so read it from the gate.

**Files (all Modify):**
- `src/app/api/tickets/mine/route.ts`
- `src/app/api/tickets/mine/[eventId]/route.ts`
- `src/app/api/tickets/mine/[eventId]/[ticketId]/route.ts`

**Interfaces:** Consumes `requireSession` from `@/lib/rbac`.

- [ ] **Step 1: Swap the guard in each file**

Replace imports lines 2–3 (`getServerSession` / `authOptions`) with `import { requireSession } from '@/lib/rbac'`. Replace the block:
```ts
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
```
with:
```ts
    const gate = await requireSession()
    if (gate instanceof NextResponse) return gate
    const { session } = gate
```
(Keep every later `session.user.id` / `session.user.email` reference unchanged.)

- [ ] **Step 2: Verify & commit**

Run: `pnpm exec tsc --noEmit` → no errors.
```bash
git add src/app/api/tickets/mine
git commit -m "refactor(rbac): route tickets/mine through requireSession"
```

---

### Task 6: Admin layout + front-end control gating

Server components gate access via `requirePageCapability` and hide mutate controls via `hasCapability`. Also fix the three stale sidebar/page links that point outside `/admin` while we're here.

**Files (all Modify):**
- `src/app/(control-center)/(dashboard)/admin/layout.tsx`
- `src/app/(control-center)/(dashboard)/admin/events/page.tsx`
- `src/app/(control-center)/(dashboard)/admin/events/[eventId]/page.tsx`
- `src/app/(control-center)/(dashboard)/admin/events/new/page.tsx`
- `src/app/(control-center)/(dashboard)/admin/events/[eventId]/tickets/new/page.tsx`

**Interfaces:** Consumes `requirePageCapability`, `hasCapability` from `@/lib/rbac`.

- [ ] **Step 1: `layout.tsx`**

Replace imports:
```ts
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
```
with:
```ts
import { requirePageCapability } from '@/lib/rbac'
```
Delete `const ADMIN_ROLES = ['ADMIN', 'STAFF', 'MANAGER'] as const`. Replace the guard:
```ts
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!ADMIN_ROLES.includes(session.user.role as typeof ADMIN_ROLES[number])) redirect('/')
```
with:
```ts
  const session = await requirePageCapability('DASHBOARD_VIEW')
```

- [ ] **Step 2: `events/page.tsx`**

Replace imports lines 1–3 (`getServerSession`, `redirect`, and keep the `authOptions` import removed) with `import { requirePageCapability, hasCapability } from '@/lib/rbac'`. Replace:
```ts
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
```
with:
```ts
  const session = await requirePageCapability('DASHBOARD_VIEW')
```
Replace the control condition and fix its link:
```ts
        {session.user.role === 'ADMIN' && (
          <Link href="/events/new" className={buttonVariants()}>
```
with:
```ts
        {hasCapability(session.user.role, 'EVENT_WRITE') && (
          <Link href="/admin/events/new" className={buttonVariants()}>
```

- [ ] **Step 3: `events/[eventId]/page.tsx`**

Swap imports to add `import { requirePageCapability, hasCapability } from '@/lib/rbac'` and drop `getServerSession`/`authOptions` (keep `notFound` from `next/navigation`). Replace:
```ts
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
```
with:
```ts
  const session = await requirePageCapability('DASHBOARD_VIEW')
```
Replace the ticket-issuing control condition and its link:
```ts
        {session.user.role === 'ADMIN' && (
          ...
            href={`/events/${eventId}/tickets/new`}
```
with:
```ts
        {hasCapability(session.user.role, 'TICKET_MANAGE') && (
          ...
            href={`/admin/events/${eventId}/tickets/new`}
```

- [ ] **Step 4: `events/new/page.tsx` (EVENT_WRITE) and `tickets/new/page.tsx` (TICKET_MANAGE)**

`events/new/page.tsx`: replace imports lines 1–3 with `import { requirePageCapability } from '@/lib/rbac'` and replace:
```ts
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/events')
```
with:
```ts
  await requirePageCapability('EVENT_WRITE')
```
`tickets/new/page.tsx`: replace imports with `import { requirePageCapability } from '@/lib/rbac'` (keep any `notFound` if present), and replace:
```ts
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/events')
```
with:
```ts
  await requirePageCapability('TICKET_MANAGE')
```
(If a later line still references `session` in these two pages, keep `const session = await requirePageCapability(...)` instead of the bare `await` form.)

- [ ] **Step 5: Verify & commit**

Run: `pnpm exec tsc --noEmit` → no errors.
Run: `pnpm exec next build` → succeeds; `/admin/*` routes present.
```bash
git add "src/app/(control-center)"
git commit -m "refactor(rbac): gate admin pages + controls via capability helpers"
```

---

### Task 7: `auth.ts` revert, matrix doc, final verification

**Files:**
- Modify: `src/lib/auth.ts`
- Create: `docs/rbac-matrix.md`

- [ ] **Step 1: Revert the `auth.ts` type regression**

In `src/lib/auth.ts`, replace both `(profile as any)?.picture ?? ''` occurrences with a single typed value. Change the `signIn` google branch so it reads:
```ts
      if (account?.provider === 'google') {
        // Google's profile includes `picture`, but the base NextAuth `Profile` type doesn't.
        const picture = (profile as { picture?: string } | undefined)?.picture ?? ''
        const participant = await prisma.participant.upsert({
          where: { email: profile?.email ?? '' },
          update: { name: profile?.name ?? '', image: picture },
          create: {
            googleId: account.providerAccountId,
            email: profile?.email ?? '',
            name: profile?.name ?? '',
            image: picture,
          },
        })
```

- [ ] **Step 2: Write `docs/rbac-matrix.md`**

```markdown
# RBAC — Role × Capability Matrix

The source of truth is `src/lib/rbac.ts` (`CAPABILITY`). This document is its
human-readable form. Roles come from the Prisma `Role` enum (`ADMIN`, `STAFF`,
`MANAGER`); `USER`/`PARTICIPANT` appear only at the session layer and hold no
admin capability.

| Capability | Meaning | ADMIN | STAFF | MANAGER |
|---|---|:-:|:-:|:-:|
| DASHBOARD_VIEW | Admin UI shell, event/ticket/artist lists | ✓ | ✓ | ✓ |
| ANALYTICS_READ | Reports / analytics endpoints | ✓ | ✓ | ✓ |
| TICKET_SCAN | Check-in / verify tickets | ✓ | ✓ | — |
| EVENT_WRITE | Create / update / delete events | ✓ | — | — |
| TICKET_MANAGE | Issue / bulk / distributor / send-PDF tickets | ✓ | — | — |
| ARTIST_MANAGE | Artist + music CRUD | ✓ | — | — |
| USER_MANAGE | User / role administration (reserved) | ✓ | — | — |

Enforcement:
- API routes: `requireApiCapability(cap)` (401 unauth, 403 under-privileged).
- Server components: `requirePageCapability(cap)` (redirect `/login` / `/`).
- Participant routes: `requireSession()` (authenticated, any role; row ownership
  enforced in-query).
- Edge backstop: `src/proxy.ts` gates `/admin/:path*` on `DASHBOARD_VIEW`.
```

- [ ] **Step 3: Final full verification**

Run each and confirm:
```bash
# No inline role policy survives outside rbac.ts (expect ZERO matches):
grep -rnE "_ROLES = \[|as typeof [A-Z_]+ROLES\[number\]|role !== 'ADMIN'|role === 'ADMIN'" src --include=*.ts --include=*.tsx | grep -v 'src/lib/rbac.ts'
pnpm test:run          # all suites green
pnpm exec tsc --noEmit # no errors
pnpm exec next build   # succeeds
```
Expected: the `grep` prints nothing; tests/typecheck/build all pass.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth.ts docs/rbac-matrix.md
git commit -m "chore(rbac): revert auth type regression + add matrix doc"
```

---

## Self-Review

**Spec coverage:**
- `rbac.ts` capability module + helpers → Task 1. ✓
- Restored `/admin/*` proxy backstop → Task 2. ✓
- All ~15 API call sites refactored → Tasks 3–5. ✓
- FE control gating + layout → Task 6. ✓
- `auth.ts` revert + matrix doc → Task 7. ✓
- Unit tests (`hasCapability` table) + gate behavior tests → Task 1 (+ proxy Task 2). ✓ (Refinement vs spec: gate behavior is tested via `requireApiCapability` directly rather than a full route handler — same auth predicate, fewer moving parts.)
- No schema change; public routes untouched → honored in Global Constraints and by omission. ✓

**Placeholder scan:** No TBD/TODO. Every code step shows exact old→new text. The one "read the file if `session` is still referenced" note (Task 6 Step 4) is a precise, bounded conditional, not a vague instruction.

**Type consistency:** `AppRole`, `Capability`, `CAPABILITY`, `hasCapability`, `requireApiCapability`, `requirePageCapability`, `requireSession` names are identical across the module, tests, proxy, routes, and pages. Gate pattern (`const gate = …; if (gate instanceof NextResponse) return gate`) is uniform; `gate.session`/`const { session } = gate` used only where the handler consumes the session (Task 5, and Task 6 pages that render `session.user.role`).

**Scope:** Single cohesive plan; `stress/*` hardening and Khalti review explicitly deferred.
