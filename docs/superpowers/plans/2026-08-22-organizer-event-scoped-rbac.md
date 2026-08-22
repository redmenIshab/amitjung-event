# Organizer Event-Scoped RBAC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `ORGANIZER` role whose accounts have read-only Control Center access to their assigned events plus ticket scanning for those events only, with every other event's CRM data unreachable.

**Architecture:** Scope lives in a new `EventAssignment` join table. `rbac.ts` keeps the flat capability map (it is bundled into the edge proxy and client components and must stay Prisma-free); a new pure `eventScope.ts` holds the scoping predicate, and a new `eventAccess.ts` holds the Prisma-backed gates. Assigned event ids ride in the JWT so `proxy.ts` can block cross-event URLs at the edge, while the server gates re-read the database and are authoritative.

**Tech Stack:** Next.js 16 (App Router, middleware is `src/proxy.ts`), React 19, Prisma 6 + PostgreSQL, NextAuth v4 (JWT), Zod 4, Vitest + Testing Library, Tailwind v4 + shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-08-22-organizer-event-scoped-rbac-design.md`

## Global Constraints

- **`src/lib/rbac.ts` must never import Prisma or `next/headers`.** It is bundled into `src/proxy.ts` (edge runtime) and into client components via `hasCapability`. Violating this fails the Turbopack build outright. All DB-backed scoping goes in `src/lib/eventAccess.ts`.
- **`src/lib/eventScope.ts` must stay pure** — no imports beyond types. It runs at the edge, on the server, and in the browser.
- **Check capabilities, never hardcode role strings** in features (ARCHITECTURE §6). The one permitted exception is `isEventScopedRole` in `eventScope.ts`, which is the definition of the scoped set.
- **Two separate migration folders** for the enum: Postgres forbids *using* a new enum value in the transaction that adds it (ARCHITECTURE §14).
- **Do not move `admin/login` inside `admin/(panel)/`** — the proxy guard would loop (ARCHITECTURE §15.3).
- **Do not gate `(public)` or `(marketing)` routes** behind any capability (ARCHITECTURE §15.4). `GET /api/events` and `GET /api/events/[eventId]` stay public and untouched.
- **`User.role` stays `@default(USER)`** (ARCHITECTURE §15.11).
- **Never return `User.password`** — go through `toStaffUserDto` (ARCHITECTURE §15.12).
- `bookingDeadline` IS the event date (ARCHITECTURE §15.9).
- Restart `next dev` after Prisma schema changes, or you get `PrismaClientValidationError` against a correct database (ARCHITECTURE §14).
- Run tests with `npx vitest run tests src` — bare `npx vitest run` also picks up a stale copy of the suite under `.claude/worktrees/`.

---

### Task 1: Schema — `ORGANIZER` role and `EventAssignment`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260822090000_add_organizer_role_enum_value/migration.sql`
- Create: `prisma/migrations/20260822090100_create_event_assignment/migration.sql`

**Interfaces:**
- Produces: Prisma model `EventAssignment` with fields `id`, `userId`, `eventId`, `createdAt`; relations `user`, `event`. `Role` enum value `ORGANIZER`. `User.assignments` and `Event.assignments` back-relations.

- [ ] **Step 1: Add the enum value to the schema**

In `prisma/schema.prisma`, extend the `Role` enum:

```prisma
enum Role {
  ADMIN
  STAFF
  MANAGER
  // Non-staff account (public sign-up). Holds no capability — see src/lib/rbac.ts.
  USER
  // Event organizer's team. Capabilities are event-scoped: they apply only to
  // events listed in EventAssignment — see src/lib/eventScope.ts.
  ORGANIZER
}
```

- [ ] **Step 2: Add the join table and back-relations**

Add to `prisma/schema.prisma`:

```prisma
/// Grants one staff account (in practice an ORGANIZER) access to one event.
/// Scope is the rows here; the role is on User. Cascade on the event side is
/// required — events are hard-deleted by DELETE /api/events/[eventId].
model EventAssignment {
  id        String   @id @default(cuid())
  userId    String
  eventId   String
  createdAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([userId, eventId])
  @@index([userId])
  @@index([eventId])
}
```

Add `assignments EventAssignment[]` to both `model User` and `model Event`.

- [ ] **Step 3: Write the enum migration**

`prisma/migrations/20260822090000_add_organizer_role_enum_value/migration.sql`:

```sql
-- Added alone: Postgres forbids using a new enum value in the same
-- transaction that adds it. The table that references it follows separately.
ALTER TYPE "Role" ADD VALUE 'ORGANIZER';
```

- [ ] **Step 4: Write the table migration**

`prisma/migrations/20260822090100_create_event_assignment/migration.sql`:

```sql
CREATE TABLE "EventAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventAssignment_userId_eventId_key" ON "EventAssignment"("userId", "eventId");
CREATE INDEX "EventAssignment_userId_idx" ON "EventAssignment"("userId");
CREATE INDEX "EventAssignment_eventId_idx" ON "EventAssignment"("eventId");

ALTER TABLE "EventAssignment" ADD CONSTRAINT "EventAssignment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventAssignment" ADD CONSTRAINT "EventAssignment_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 5: Regenerate the client and verify**

Run: `npx prisma generate && npx prisma validate`
Expected: both succeed. `npx prisma migrate status` should list the two new migrations as pending (or applied, if a database is reachable).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(rbac): add ORGANIZER role and EventAssignment table"
```

---

### Task 2: `eventScope.ts` — the pure scoping predicate

**Files:**
- Create: `src/lib/eventScope.ts`
- Test: `tests/lib/eventScope.test.ts`

**Interfaces:**
- Consumes: `AppRole` from `@/lib/rbac` (type-only import).
- Produces:
  - `isEventScopedRole(role: AppRole | undefined): boolean`
  - `canAccessEvent(role: AppRole | undefined, assignedEventIds: readonly string[] | undefined, eventId: string): boolean`
  - `EVENT_SCOPED_CAPABILITIES: ReadonlySet<Capability>`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/eventScope.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { canAccessEvent, isEventScopedRole } from '@/lib/eventScope'

describe('isEventScopedRole', () => {
  it('is true only for ORGANIZER', () => {
    expect(isEventScopedRole('ORGANIZER')).toBe(true)
    expect(isEventScopedRole('ADMIN')).toBe(false)
    expect(isEventScopedRole('STAFF')).toBe(false)
    expect(isEventScopedRole('MANAGER')).toBe(false)
    expect(isEventScopedRole('USER')).toBe(false)
    expect(isEventScopedRole(undefined)).toBe(false)
  })
})

describe('canAccessEvent', () => {
  it('unscoped staff roles reach any event', () => {
    expect(canAccessEvent('ADMIN', undefined, 'e1')).toBe(true)
    expect(canAccessEvent('STAFF', [], 'e1')).toBe(true)
    expect(canAccessEvent('MANAGER', ['e2'], 'e1')).toBe(true)
  })

  it('ORGANIZER reaches only assigned events', () => {
    expect(canAccessEvent('ORGANIZER', ['e1', 'e2'], 'e1')).toBe(true)
    expect(canAccessEvent('ORGANIZER', ['e1', 'e2'], 'e3')).toBe(false)
  })

  it('ORGANIZER with no assignments reaches nothing', () => {
    expect(canAccessEvent('ORGANIZER', [], 'e1')).toBe(false)
    expect(canAccessEvent('ORGANIZER', undefined, 'e1')).toBe(false)
  })

  it('never grants access on an empty event id', () => {
    expect(canAccessEvent('ORGANIZER', ['e1'], '')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/eventScope.test.ts`
Expected: FAIL — cannot resolve `@/lib/eventScope`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/eventScope.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/eventScope.test.ts`
Expected: PASS (10 assertions across 4 tests).

Note: this task compiles only once Task 3 adds `EVENT_READ` and `SALES_READ` to `Capability`. Run `npx tsc --noEmit` at the end of Task 3, not here.

- [ ] **Step 5: Commit**

```bash
git add src/lib/eventScope.ts tests/lib/eventScope.test.ts
git commit -m "feat(rbac): add pure event-scoping predicate"
```

---

### Task 3: Capability matrix — `EVENT_READ`, `SALES_READ`, `ARTIST_READ`, ORGANIZER

**Files:**
- Modify: `src/lib/rbac.ts:10-24` (the `CAPABILITY` map)
- Test: `tests/lib/rbac.test.ts:11-30` (extend the existing `cases` table)

**Interfaces:**
- Produces: capabilities `EVENT_READ`, `SALES_READ`, `ARTIST_READ`; `ORGANIZER` present in `DASHBOARD_VIEW`, `EVENT_READ`, `ANALYTICS_READ`, `TICKET_SCAN`, `SALES_READ`.

- [ ] **Step 1: Write the failing test**

Add these rows to the `cases` array in `tests/lib/rbac.test.ts`, keeping every existing row untouched (they are the regression guard):

```ts
    // ── ORGANIZER: event-scoped read + scan ──
    ['ORGANIZER', 'DASHBOARD_VIEW', true],
    ['ORGANIZER', 'EVENT_READ', true],
    ['ORGANIZER', 'ANALYTICS_READ', true],
    ['ORGANIZER', 'TICKET_SCAN', true],
    ['ORGANIZER', 'SALES_READ', true],
    // ── ORGANIZER: everything else denied ──
    ['ORGANIZER', 'EVENT_WRITE', false],
    ['ORGANIZER', 'TICKET_MANAGE', false],
    ['ORGANIZER', 'ARTIST_MANAGE', false],
    ['ORGANIZER', 'ARTIST_READ', false],
    ['ORGANIZER', 'USER_MANAGE', false],
    ['ORGANIZER', 'MARKETING_MANAGE', false],
    ['ORGANIZER', 'FINANCE_READ', false],
    // ── the FINANCE_READ split must not widen anyone ──
    ['ADMIN', 'SALES_READ', true],
    ['ADMIN', 'FINANCE_READ', true],
    ['STAFF', 'SALES_READ', false],
    ['STAFF', 'FINANCE_READ', false],
    ['MANAGER', 'SALES_READ', false],
    ['MANAGER', 'FINANCE_READ', false],
    // ── ARTIST_READ keeps existing staff visibility ──
    ['ADMIN', 'ARTIST_READ', true],
    ['STAFF', 'ARTIST_READ', true],
    ['MANAGER', 'ARTIST_READ', true],
    // ── EVENT_READ for existing staff ──
    ['STAFF', 'EVENT_READ', true],
    ['MANAGER', 'EVENT_READ', true],
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/rbac.test.ts`
Expected: FAIL — `ORGANIZER` is not assignable to `AppRole`, and `EVENT_READ` / `SALES_READ` / `ARTIST_READ` are not `Capability` keys.

- [ ] **Step 3: Update the capability map**

Replace the `CAPABILITY` map in `src/lib/rbac.ts`:

```ts
export const CAPABILITY = {
  // Control Center shell. ORGANIZER holds it so the proxy lets them in at all;
  // every page behind it scopes its own data — see src/lib/eventAccess.ts.
  DASHBOARD_VIEW: ['ADMIN', 'STAFF', 'MANAGER', 'ORGANIZER'],
  // Read one event's CRM record: detail page, ticket list, attendee data.
  // Event-scoped for ORGANIZER.
  EVENT_READ: ['ADMIN', 'STAFF', 'MANAGER', 'ORGANIZER'],
  ANALYTICS_READ: ['ADMIN', 'STAFF', 'MANAGER', 'ORGANIZER'],
  TICKET_SCAN: ['ADMIN', 'STAFF', 'ORGANIZER'],
  EVENT_WRITE: ['ADMIN'],
  TICKET_MANAGE: ['ADMIN'],
  ARTIST_MANAGE: ['ADMIN'],
  // Read artists/music. Split from ARTIST_MANAGE so the Artists nav link and
  // pages hide from ORGANIZER by capability rather than by a role string,
  // without narrowing what STAFF/MANAGER could already see.
  ARTIST_READ: ['ADMIN', 'STAFF', 'MANAGER'],
  MARKETING_MANAGE: ['ADMIN', 'MANAGER'],
  USER_MANAGE: ['ADMIN'],
  // An event's OWN sales: gross, refunds, net, average ticket price. The
  // organizer's money, so they see it for their assigned events.
  SALES_READ: ['ADMIN', 'ORGANIZER'],
  // Lyante's side of the ledger: commission rates and income, platform-wide
  // totals, and cross-event peer comparison. Deliberately narrower than
  // SALES_READ — an organizer sees their revenue, not our margin, and never
  // another event's figures.
  FINANCE_READ: ['ADMIN'],
} as const satisfies Record<string, readonly AppRole[]>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/rbac.test.ts tests/lib/eventScope.test.ts && npx tsc --noEmit`
Expected: PASS on both files; `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rbac.ts tests/lib/rbac.test.ts
git commit -m "feat(rbac): add EVENT_READ, SALES_READ, ARTIST_READ and ORGANIZER grants"
```

---

### Task 4: JWT and session carry assigned event ids

**Files:**
- Modify: `src/types/next-auth.d.ts`
- Modify: `src/lib/auth.ts:60-95` (the `jwt` and `session` callbacks)
- Test: `tests/lib/auth-callbacks.test.ts` (create)

**Interfaces:**
- Consumes: `prisma.eventAssignment` from Task 1.
- Produces: `session.user.eventIds?: string[]` and `token.eventIds?: string[]`, populated only for `ORGANIZER`.

- [ ] **Step 1: Extend the NextAuth types**

Replace `src/types/next-auth.d.ts`:

```ts
import NextAuth from 'next-auth'

type StaffRole = 'ADMIN' | 'STAFF' | 'MANAGER' | 'USER' | 'ORGANIZER'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      role: StaffRole | 'PARTICIPANT'
      /**
       * Events an event-scoped role may act on. Present only for ORGANIZER;
       * undefined for every other role, which means "not scoped", not "none".
       */
      eventIds?: string[]
    }
  }
  interface User {
    role: StaffRole
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: StaffRole | 'PARTICIPANT'
    id: string
    eventIds?: string[]
  }
}
```

- [ ] **Step 2: Write the failing test**

Create `tests/lib/auth-callbacks.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const userFindUnique = vi.hoisted(() => vi.fn())
const assignmentFindMany = vi.hoisted(() => vi.fn())

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: userFindUnique },
    eventAssignment: { findMany: assignmentFindMany },
  },
}))

import { authOptions } from '@/lib/auth'

const jwt = authOptions.callbacks!.jwt!
const session = authOptions.callbacks!.session!

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const call = (token: any) => jwt({ token } as any) as Promise<any>

describe('jwt callback — organizer scope', () => {
  beforeEach(() => {
    userFindUnique.mockReset()
    assignmentFindMany.mockReset()
  })

  it('loads assigned event ids for an ORGANIZER', async () => {
    userFindUnique.mockResolvedValue({ role: 'ORGANIZER', deletedAt: null })
    assignmentFindMany.mockResolvedValue([{ eventId: 'e1' }, { eventId: 'e2' }])
    const out = await call({ id: 'u1', role: 'ORGANIZER' })
    expect(out.eventIds).toEqual(['e1', 'e2'])
  })

  it('does not query assignments for non-scoped roles', async () => {
    userFindUnique.mockResolvedValue({ role: 'ADMIN', deletedAt: null })
    const out = await call({ id: 'u1', role: 'ADMIN' })
    expect(assignmentFindMany).not.toHaveBeenCalled()
    expect(out.eventIds).toBeUndefined()
  })

  it('collapses a deactivated organizer to USER with no events', async () => {
    userFindUnique.mockResolvedValue({ role: 'ORGANIZER', deletedAt: new Date() })
    const out = await call({ id: 'u1', role: 'ORGANIZER', eventIds: ['e1'] })
    expect(out.role).toBe('USER')
    expect(out.eventIds).toEqual([])
  })

  it('clears scope when the account is gone', async () => {
    userFindUnique.mockResolvedValue(null)
    const out = await call({ id: 'u1', role: 'ORGANIZER', eventIds: ['e1'] })
    expect(out.role).toBe('USER')
    expect(out.eventIds).toEqual([])
  })

  it('skips the lookup entirely for PARTICIPANT', async () => {
    const out = await call({ id: 'p1', role: 'PARTICIPANT' })
    expect(userFindUnique).not.toHaveBeenCalled()
    expect(out.role).toBe('PARTICIPANT')
  })
})

describe('session callback', () => {
  it('copies eventIds onto the session user', async () => {
    const out = await (session as any)({
      session: { user: {} },
      token: { id: 'u1', role: 'ORGANIZER', eventIds: ['e1'] },
    })
    expect(out.user.eventIds).toEqual(['e1'])
    expect(out.user.role).toBe('ORGANIZER')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/auth-callbacks.test.ts`
Expected: FAIL — `out.eventIds` is `undefined` for the organizer case.

- [ ] **Step 4: Update the `jwt` and `session` callbacks**

In `src/lib/auth.ts`, replace the refresh half of the `jwt` callback (everything after the `if (user) { … }` block) with:

```ts
      // Refresh path (no `user`): re-read the staff row so a role change or a
      // deactivation takes effect without waiting for the token to expire.
      // Buyers are skipped — PARTICIPANT lives in the Participant table and
      // never has a staff row to look up.
      if (token.role === 'PARTICIPANT' || !token.id) return token

      const current = await prisma.user.findUnique({
        where: { id: token.id },
        select: { role: true, deletedAt: true },
      })

      // Deleted or deactivated collapses to USER, which holds no capability
      // (see CAPABILITY in src/lib/rbac.ts), so every existing gate rejects it.
      const revoked = !current || current.deletedAt !== null
      token.role = revoked ? 'USER' : current.role

      // Event scope rides along so the edge proxy can block cross-event URLs
      // without a database round trip. Only scoped roles pay for the query.
      // Revocation clears it in the same breath as the role.
      if (revoked) {
        token.eventIds = []
      } else if (isEventScopedRole(token.role)) {
        const rows = await prisma.eventAssignment.findMany({
          where: { userId: token.id },
          select: { eventId: true },
        })
        token.eventIds = rows.map((r) => r.eventId)
      } else {
        delete token.eventIds
      }

      return token
```

Add the import at the top of `src/lib/auth.ts`:

```ts
import { isEventScopedRole } from '@/lib/eventScope'
```

Replace the `session` callback:

```ts
    async session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      // Undefined for unscoped roles — meaning "not scoped", not "no events".
      session.user.eventIds = token.eventIds
      return session
    },
```

Also widen the sign-in branch's inline role cast to include the new value:

```ts
          token.role = (user as { role: 'ADMIN' | 'STAFF' | 'MANAGER' | 'USER' | 'ORGANIZER' }).role
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/auth-callbacks.test.ts && npx tsc --noEmit`
Expected: PASS, `tsc` clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/types/next-auth.d.ts tests/lib/auth-callbacks.test.ts
git commit -m "feat(rbac): carry organizer event scope in the JWT and session"
```

---

### Task 5: `eventAccess.ts` — the Prisma-backed gates

**Files:**
- Create: `src/lib/eventAccess.ts`
- Test: `tests/lib/eventAccess.test.ts`

**Interfaces:**
- Consumes: `canAccessEvent`, `isEventScopedRole` (Task 2); `hasCapability`, `Capability` (Task 3).
- Produces:
  - `assignedEventIds(userId: string): Promise<string[]>`
  - `visibleEventIds(session: Session): Promise<string[] | null>` — `null` means all events
  - `requireEventApiCapability(cap: Capability, eventId: string): Promise<{ session: Session } | NextResponse>`
  - `requireEventPageCapability(cap: Capability, eventId: string): Promise<Session>`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/eventAccess.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const mockGetServerSession = vi.hoisted(() => vi.fn())
const assignmentFindMany = vi.hoisted(() => vi.fn())
const mockRedirect = vi.hoisted(() => vi.fn(() => { throw new Error('REDIRECT') }))

vi.mock('next-auth/next', () => ({ getServerSession: mockGetServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('next/navigation', () => ({ redirect: mockRedirect }))
vi.mock('@/lib/prisma', () => ({
  prisma: { eventAssignment: { findMany: assignmentFindMany } },
}))

import {
  requireEventApiCapability,
  requireEventPageCapability,
  visibleEventIds,
} from '@/lib/eventAccess'

const sess = (role: string, id = 'u1') => ({ user: { id, role } })

describe('visibleEventIds', () => {
  beforeEach(() => assignmentFindMany.mockReset())

  it('returns null (all events) for unscoped staff', async () => {
    expect(await visibleEventIds(sess('ADMIN') as never)).toBeNull()
    expect(await visibleEventIds(sess('STAFF') as never)).toBeNull()
    expect(assignmentFindMany).not.toHaveBeenCalled()
  })

  it('returns the assigned ids for an ORGANIZER', async () => {
    assignmentFindMany.mockResolvedValue([{ eventId: 'e1' }])
    expect(await visibleEventIds(sess('ORGANIZER') as never)).toEqual(['e1'])
  })
})

describe('requireEventApiCapability', () => {
  beforeEach(() => {
    mockGetServerSession.mockReset()
    assignmentFindMany.mockReset()
  })

  it('401 without a session', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const r = await requireEventApiCapability('EVENT_READ', 'e1')
    expect(r).toBeInstanceOf(NextResponse)
    expect((r as NextResponse).status).toBe(401)
  })

  it('403 when the role lacks the capability', async () => {
    mockGetServerSession.mockResolvedValue(sess('ORGANIZER'))
    const r = await requireEventApiCapability('EVENT_WRITE', 'e1')
    expect((r as NextResponse).status).toBe(403)
  })

  it('403 when an organizer targets an unassigned event', async () => {
    mockGetServerSession.mockResolvedValue(sess('ORGANIZER'))
    assignmentFindMany.mockResolvedValue([{ eventId: 'e1' }])
    const r = await requireEventApiCapability('EVENT_READ', 'e999')
    expect((r as NextResponse).status).toBe(403)
  })

  it('passes an organizer on an assigned event', async () => {
    mockGetServerSession.mockResolvedValue(sess('ORGANIZER'))
    assignmentFindMany.mockResolvedValue([{ eventId: 'e1' }])
    const r = await requireEventApiCapability('EVENT_READ', 'e1')
    expect(r).not.toBeInstanceOf(NextResponse)
  })

  it('ignores a stale token and re-reads the database', async () => {
    // Token claims e9; the DB says otherwise. The DB wins.
    mockGetServerSession.mockResolvedValue({
      user: { id: 'u1', role: 'ORGANIZER', eventIds: ['e9'] },
    })
    assignmentFindMany.mockResolvedValue([])
    const r = await requireEventApiCapability('EVENT_READ', 'e9')
    expect((r as NextResponse).status).toBe(403)
  })

  it('passes staff on any event without an assignment query', async () => {
    mockGetServerSession.mockResolvedValue(sess('STAFF'))
    const r = await requireEventApiCapability('EVENT_READ', 'anything')
    expect(r).not.toBeInstanceOf(NextResponse)
    expect(assignmentFindMany).not.toHaveBeenCalled()
  })
})

describe('requireEventPageCapability', () => {
  beforeEach(() => {
    mockGetServerSession.mockReset()
    assignmentFindMany.mockReset()
    mockRedirect.mockClear()
  })

  it('redirects to admin login without a session', async () => {
    mockGetServerSession.mockResolvedValue(null)
    await expect(requireEventPageCapability('EVENT_READ', 'e1')).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/admin/login')
  })

  it('sends an out-of-scope organizer back to their event list', async () => {
    mockGetServerSession.mockResolvedValue(sess('ORGANIZER'))
    assignmentFindMany.mockResolvedValue([{ eventId: 'e1' }])
    await expect(requireEventPageCapability('EVENT_READ', 'e2')).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/admin/events')
  })

  it('sends a non-staff role to the public site', async () => {
    mockGetServerSession.mockResolvedValue(sess('PARTICIPANT'))
    await expect(requireEventPageCapability('EVENT_READ', 'e1')).rejects.toThrow('REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/eventAccess.test.ts`
Expected: FAIL — cannot resolve `@/lib/eventAccess`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/eventAccess.ts`:

```ts
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

/** Resolves the caller and checks capability + event scope in one step. */
async function gate(
  cap: Capability,
  eventId: string,
): Promise<{ session: Session } | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'OUT_OF_SCOPE'> {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/eventAccess.test.ts && npx tsc --noEmit`
Expected: PASS (13 tests), `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/eventAccess.ts tests/lib/eventAccess.test.ts
git commit -m "feat(rbac): add database-backed event-scoped gates"
```

---

### Task 6: Middleware — block cross-event URLs at the edge

**Files:**
- Modify: `src/proxy.ts`
- Test: `tests/proxy.test.ts` (extend)

**Interfaces:**
- Consumes: `canAccessEvent`, `isEventScopedRole` (Task 2); `token.eventIds` (Task 4).
- Produces: no new exports; `proxy()` behaviour only.

- [ ] **Step 1: Write the failing test**

Append to `tests/proxy.test.ts`, inside a new `describe`:

```ts
describe('proxy — organizer event scoping', () => {
  beforeEach(() => mockGetToken.mockReset())

  const organizer = (eventIds: string[]) =>
    mockGetToken.mockResolvedValue({ role: 'ORGANIZER', id: 'u1', eventIds })

  it('allows an assigned event', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/e1'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('allows nested paths under an assigned event', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/e1/analytics'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('blocks an unassigned event', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/e2'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('blocks the edit page even for an assigned event', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/e1/edit'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('blocks ticket generation for an assigned event', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/e1/tickets/new'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('blocks event creation', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/new'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('blocks user administration', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/users'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('blocks the artists area', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/artists/a1/music'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('allows the scoped dashboard, scanner and event list', async () => {
    for (const path of ['/admin/dashboard', '/admin/scanner', '/admin/events']) {
      organizer(['e1'])
      const res = await proxy(req(path))
      expect(res.headers.get('location')).toBeNull()
    }
  })

  it('blocks an organizer with no assignments from any event', async () => {
    organizer([])
    const res = await proxy(req('/admin/events/e1'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('leaves ADMIN unrestricted', async () => {
    mockGetToken.mockResolvedValue({ role: 'ADMIN', id: 'a1' })
    for (const path of ['/admin/users', '/admin/events/e2/edit', '/admin/artists']) {
      const res = await proxy(req(path))
      expect(res.headers.get('location')).toBeNull()
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/proxy.test.ts`
Expected: FAIL — organizers currently pass through everywhere.

- [ ] **Step 3: Write the implementation**

Replace `src/proxy.ts`:

```ts
import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { hasCapability } from '@/lib/rbac'
import { canAccessEvent, isEventScopedRole } from '@/lib/eventScope'

/** Where a blocked organizer lands. Must be a path they are allowed, or this loops. */
const ORGANIZER_HOME = '/admin/events'

/**
 * Areas an event-scoped role may never enter, whatever event is involved.
 * Written as path prefixes/patterns because the edge cannot resolve
 * capabilities per page — the page gates remain the authority.
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/proxy.test.ts`
Expected: PASS — the 3 original tests plus 11 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/proxy.ts tests/proxy.test.ts
git commit -m "feat(rbac): block cross-event admin URLs at the edge"
```

---

### Task 7: Scanning — refuse out-of-scope tickets without consuming them

**Files:**
- Modify: `src/lib/verify.ts:5-50`
- Modify: `src/app/api/verify/[token]/route.ts`
- Test: `tests/lib/verify.test.ts` (extend)

**Interfaces:**
- Consumes: `visibleEventIds` (Task 5).
- Produces: `verifyTicket(token: string, allowedEventIds?: string[] | null)`; new `VerifyResult` variant `{ valid: false; reason: 'WRONG_EVENT'; eventName: string }`.

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/verify.test.ts`:

```ts
describe('verifyTicket — event scope', () => {
  it('refuses a ticket outside the allowed events without consuming it', async () => {
    const ticket = {
      id: 't1',
      status: 'UNUSED',
      eventId: 'e2',
      attendeeName: 'A',
      attendeeEmail: 'a@x.co',
      distributorName: null,
      category: 'GENERAL',
      event: { name: 'Other Event' },
      checkIn: null,
    }
    const update = vi.fn()
    const create = vi.fn()
    mockTransaction.mockImplementation((fn: any) =>
      fn({
        ticket: { findUnique: vi.fn().mockResolvedValue(ticket), update },
        checkIn: { create },
      }),
    )

    const result = await verifyTicket('tok', ['e1'])

    expect(result).toEqual({ valid: false, reason: 'WRONG_EVENT', eventName: 'Other Event' })
    expect(update).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('checks in a ticket that is inside the allowed events', async () => {
    const ticket = {
      id: 't1',
      status: 'UNUSED',
      eventId: 'e1',
      attendeeName: 'A',
      attendeeEmail: 'a@x.co',
      distributorName: null,
      category: 'GENERAL',
      event: { name: 'My Event' },
      checkIn: null,
    }
    const update = vi.fn()
    const create = vi.fn()
    mockTransaction.mockImplementation((fn: any) =>
      fn({
        ticket: { findUnique: vi.fn().mockResolvedValue(ticket), update },
        checkIn: { create },
      }),
    )

    const result = await verifyTicket('tok', ['e1'])

    expect(result.valid).toBe(true)
    expect(update).toHaveBeenCalledOnce()
    expect(create).toHaveBeenCalledOnce()
  })
})
```

If `tests/lib/verify.test.ts` has no `mockTransaction` harness yet, create the file with this header:

```ts
import { describe, it, expect, vi } from 'vitest'

const mockTransaction = vi.hoisted(() => vi.fn())
vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: mockTransaction } }))

import { verifyTicket } from '@/lib/verify'
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/verify.test.ts`
Expected: FAIL — `verifyTicket` takes one argument and checks the ticket in regardless.

- [ ] **Step 3: Update `verifyTicket`**

In `src/lib/verify.ts`, extend the result union:

```ts
export type VerifyResult =
  | {
      valid: true
      attendeeName: string | null
      attendeeEmail: string | null
      distributorName: string | null
      category: 'GENERAL' | 'VIP'
      eventName: string
    }
  | { valid: false; reason: 'NOT_FOUND' | 'CANCELLED' }
  | { valid: false; reason: 'ALREADY_USED'; usedAt: Date }
  /** Valid ticket, wrong event for this scanner. Never consumed. */
  | { valid: false; reason: 'WRONG_EVENT'; eventName: string }
```

Replace the signature and add the scope check **before** any mutation:

```ts
/**
 * Checks a ticket in.
 *
 * @param allowedEventIds Restricts the scanner to these events. `null` or
 *   omitted means unrestricted (ADMIN/STAFF — unchanged behaviour). The check
 *   runs before the update, so a wrong-event scan can never consume a ticket.
 */
export async function verifyTicket(
  token: string,
  allowedEventIds?: string[] | null,
): Promise<VerifyResult> {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { token },
      include: {
        event: { select: { name: true } },
        checkIn: { select: { scannedAt: true } },
      },
    })

    if (!ticket) return { valid: false, reason: 'NOT_FOUND' } as const

    // Scope first: refusing after the update would burn the attendee's ticket.
    if (allowedEventIds && !allowedEventIds.includes(ticket.eventId)) {
      return { valid: false, reason: 'WRONG_EVENT', eventName: ticket.event.name } as const
    }

    if (ticket.status === 'CANCELLED') return { valid: false, reason: 'CANCELLED' } as const
    if (ticket.status === 'USED') {
      return {
        valid: false,
        reason: 'ALREADY_USED',
        usedAt: ticket.checkIn!.scannedAt,
      } as const
    }

    await tx.ticket.update({ where: { id: ticket.id }, data: { status: 'USED' } })
    await tx.checkIn.create({ data: { ticketId: ticket.id } })

    return {
      valid: true,
      attendeeName: ticket.attendeeName,
      attendeeEmail: ticket.attendeeEmail,
      distributorName: ticket.distributorName,
      category: ticket.category,
      eventName: ticket.event.name,
    } as const
  })
}
```

- [ ] **Step 4: Pass the caller's scope from the route**

Replace `src/app/api/verify/[token]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { visibleEventIds } from '@/lib/eventAccess'
import { verifyTicket } from '@/lib/verify'

type Params = { params: Promise<{ token: string }> }

export async function POST(_req: Request, { params }: Params) {
  const gate = await requireApiCapability('TICKET_SCAN')
  if (gate instanceof NextResponse) return gate

  // null for ADMIN/STAFF — scan anything. An organizer is confined to their
  // assigned events, re-read from the database rather than from the token.
  const allowed = await visibleEventIds(gate.session)

  const { token } = await params
  const result = await verifyTicket(token, allowed)
  const status = result.valid ? 200 : result.reason === 'NOT_FOUND' ? 404 : 200
  return NextResponse.json(result, { status })
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/lib/verify.test.ts && npx tsc --noEmit`
Expected: PASS, `tsc` clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/verify.ts src/app/api/verify/\[token\]/route.ts tests/lib/verify.test.ts
git commit -m "feat(rbac): confine ticket scanning to the scanner's events"
```

---

### Task 8: Analytics — scope the platform roll-up, gate peer comparison

**Files:**
- Modify: `src/lib/analytics.ts:281-330` (`getEventPeerComparison`), `:346` (`getPlatformAnalytics`)
- Test: `tests/lib/analytics.test.ts` (extend)

**Interfaces:**
- Produces: `getPlatformAnalytics(eventIds?: string[] | null)` — `null`/omitted keeps today's platform-wide behaviour.

- [ ] **Step 1: Write the failing test**

Add to `tests/lib/analytics.test.ts`:

```ts
describe('getPlatformAnalytics — scoped roll-up', () => {
  it('filters every aggregate by the supplied event ids', async () => {
    // Assert the where-clauses reaching Prisma, which is what confines an
    // organizer's dashboard to their own events.
    const seen: Record<string, unknown> = {}
    paymentGroupBy.mockImplementation((args: any) => {
      seen.payments = args.where
      return []
    })
    eventFindMany.mockImplementation((args: any) => {
      seen.events = args.where
      return []
    })
    ticketGroupBy.mockImplementation((args: any) => {
      seen.tickets = args.where
      return []
    })

    await getPlatformAnalytics(['e1'])

    expect(seen.events).toEqual({ id: { in: ['e1'] } })
    expect(seen.payments).toEqual({ eventId: { in: ['e1'] } })
    expect(seen.tickets).toEqual({ eventId: { in: ['e1'] } })
  })

  it('applies no filter when called with no scope', async () => {
    const seen: Record<string, unknown> = {}
    eventFindMany.mockImplementation((args: any) => {
      seen.events = args.where
      return []
    })
    await getPlatformAnalytics()
    expect(seen.events).toBeUndefined()
  })
})
```

Mock names (`paymentGroupBy`, `eventFindMany`, `ticketGroupBy`) must match the existing hoisted mocks in that file; add them if the file mocks Prisma differently.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/lib/analytics.test.ts`
Expected: FAIL — `getPlatformAnalytics` takes no arguments and filters nothing.

- [ ] **Step 3: Add the scope parameter**

In `src/lib/analytics.ts`, extend `paymentTotals` to accept a scope:

```ts
/** Sums PAID and REFUND amounts in one grouped query, optionally scoped. */
async function paymentTotals(scope?: { eventId?: string; eventIds?: string[] | null }) {
  const where = scope?.eventId
    ? { eventId: scope.eventId }
    : scope?.eventIds
      ? { eventId: { in: scope.eventIds } }
      : undefined
  const rows = await prisma.payment.groupBy({
    by: ['paymentStatus'],
    where,
    _sum: { finalAmount: true },
  })
  let gross = 0
  let refunds = 0
  for (const r of rows) {
    if (r.paymentStatus === 'PAID') gross = r._sum.finalAmount ?? 0
    if (r.paymentStatus === 'REFUND') refunds = r._sum.finalAmount ?? 0
  }
  return { gross, refunds }
}
```

Update the existing call in `getEventAnalytics` from `paymentTotals(eventId)` to `paymentTotals({ eventId })`.

Change the signature and queries of `getPlatformAnalytics`:

```ts
/**
 * Platform roll-up.
 *
 * @param eventIds Restricts every aggregate to these events. `null` or omitted
 *   is the platform-wide view (ADMIN). An event-scoped role passes its assigned
 *   ids so the dashboard never totals events it cannot see.
 */
export async function getPlatformAnalytics(
  eventIds?: string[] | null,
): Promise<PlatformAnalytics> {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const eventWhere = eventIds ? { id: { in: eventIds } } : undefined
  const byEventWhere = eventIds ? { eventId: { in: eventIds } } : undefined
```

Then thread `byEventWhere` / `eventWhere` through the parallel queries:

```ts
    paymentTotals({ eventIds }),
    prisma.payment.groupBy({
      by: ['eventId', 'paymentStatus'],
      where: byEventWhere,
      _sum: { finalAmount: true },
    }),
    prisma.event.findMany({
      where: eventWhere,
      select: { id: true, name: true, status: true, commissionPercentage: true },
    }),
    prisma.ticket.groupBy({
      by: ['eventId', 'status', 'source'],
      where: byEventWhere,
      _count: true,
    }),
```

and scope the sales trend:

```ts
    prisma.payment.findMany({
      where: { paymentStatus: 'PAID', ...(byEventWhere ?? {}) },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
```

Leave the `participants` / `newParticipants30d` / `staff` counts as they are — Task 9 hides those tiles from organizers rather than miscounting them.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/lib/analytics.test.ts && npx tsc --noEmit`
Expected: PASS, `tsc` clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics.ts tests/lib/analytics.test.ts
git commit -m "feat(analytics): allow the platform roll-up to be event-scoped"
```

---

### Task 9: Admin pages — scope every Control Center surface

**Files:**
- Modify: `src/app/(control-center)/(dashboard)/admin/(panel)/events/page.tsx`
- Modify: `src/app/(control-center)/(dashboard)/admin/(panel)/events/[eventId]/page.tsx:24`
- Modify: `src/app/(control-center)/(dashboard)/admin/(panel)/events/[eventId]/analytics/page.tsx:35-92`
- Modify: `src/app/(control-center)/(dashboard)/admin/(panel)/events/[eventId]/edit/page.tsx:11`
- Modify: `src/app/(control-center)/(dashboard)/admin/(panel)/dashboard/page.tsx:29-35`
- Modify: `src/app/(control-center)/(dashboard)/admin/(panel)/artists/page.tsx` and the four other artist pages
- Modify: `src/app/(control-center)/(dashboard)/admin/(panel)/scanner/page.tsx`

**Interfaces:**
- Consumes: `visibleEventIds`, `requireEventPageCapability` (Task 5); `getPlatformAnalytics(eventIds)` (Task 8).

- [ ] **Step 1: Scope the events list**

In `events/page.tsx`, after the session line:

```ts
  const session = await requirePageCapability('DASHBOARD_VIEW')

  // null = every event (ADMIN/STAFF/MANAGER); an array confines an organizer
  // to their assignments.
  const scope = await visibleEventIds(session)

  // Read directly from the DB (not the cache) so admin always sees the true,
  // current state — including drafts and changes made just now.
  const rows = await prisma.event.findMany({
    where: scope ? { id: { in: scope } } : undefined,
    orderBy: { bookingDeadline: 'asc' },
    include: {
      _count: { select: { tickets: true } },
      artist: { select: { id: true, artistName: true, artistImage: true } },
    },
  })
```

Import `visibleEventIds` from `@/lib/eventAccess`.

- [ ] **Step 2: Scope the event detail page**

In `events/[eventId]/page.tsx`, replace the gate. The `eventId` must be read from `params` **before** the gate, so move the `await params` line above it:

```ts
  const { eventId } = await params
  const session = await requireEventPageCapability('EVENT_READ', eventId)
```

Import `requireEventPageCapability` from `@/lib/eventAccess`, and drop the now-unused `requirePageCapability` import if nothing else uses it. `hasCapability` stays — it already hides the manage and generate buttons from roles without `EVENT_WRITE` / `TICKET_MANAGE`.

- [ ] **Step 3: Scope the edit page**

In `events/[eventId]/edit/page.tsx`, the gate is `EVENT_WRITE`, which ORGANIZER does not hold — no scoping change is needed. Confirm the order is `await params` then `requirePageCapability('EVENT_WRITE')` and leave it otherwise untouched.

- [ ] **Step 4: Split money on the analytics page**

In `events/[eventId]/analytics/page.tsx`, replace the gate block:

```ts
  const { eventId } = await params
  // Volume metrics for anyone who can read this event's analytics; money is
  // split — an organizer sees their own sales, never Lyante's commission or
  // any other event's figures.
  const session = await requireEventPageCapability('ANALYTICS_READ', eventId)
  const canSeeSales = hasCapability(session.user.role, 'SALES_READ')
  const canSeeCommission = hasCapability(session.user.role, 'FINANCE_READ')

  const [a, peers] = await Promise.all([
    getEventAnalytics(eventId),
    // Peer comparison names OTHER events and their net revenue. Fetched only
    // for the platform owner — for anyone else it must never reach the client
    // payload or the PDF.
    canSeeCommission ? getEventPeerComparison(eventId) : Promise.resolve(null),
  ])
  if (!a) notFound()
```

Then, in the `pdfInput` literal, replace `money: canSeeMoney ? {…} : null` with `money: canSeeSales ? { … } : null` and inside that object make the two commission fields conditional:

```ts
          commissionIncome: canSeeCommission ? a.money.commissionIncome : null,
          commissionRate: canSeeCommission ? a.money.commissionRate : null,
```

Replace `peers: canSeeMoney ? {…} : null` with `peers: peers ? { … } : null` (using the same field mapping as today), and the chart list entry with:

```ts
      ...(peers && peers.rankByNet !== null
        ? [{ id: CHART_IDS.peers, caption: 'Net sales by event' }]
        : []),
```

In the JSX, change `{canSeeMoney ? (` to `{canSeeSales ? (`, wrap the "Lyante commission" `StatTile` in `{canSeeCommission && ( … )}`, wrap the missing-rate amber notice in `{canSeeCommission && a.money.commissionRate === null && ( … )}` (it links to the edit page, which an organizer cannot open), and change the restricted-figures fallback copy to:

```tsx
        <p className="text-xs text-gray-500 bg-gray-50 border border-black/5 rounded-md px-3 py-2">
          Financial figures are restricted for your role.
        </p>
```

Finally, guard every remaining `peers.` usage further down the page with `{peers && ( … )}`.

- [ ] **Step 5: Scope the dashboard**

In `dashboard/page.tsx`:

```ts
  const session = await requirePageCapability('DASHBOARD_VIEW')
  // Money splits two ways: an organizer sees sales for their own events,
  // ADMIN additionally sees commission and platform-wide figures.
  const canSeeSales = hasCapability(session.user.role, 'SALES_READ')
  const canSeeCommission = hasCapability(session.user.role, 'FINANCE_READ')
  const scope = await visibleEventIds(session)

  const [a, upcomingEvents] = await Promise.all([
    getPlatformAnalytics(scope),
    getCachedUpcomingEvents(),
  ])
  const scopedEvents = scope
    ? upcomingEvents.filter((e) => scope.includes(e.id))
    : upcomingEvents
```

Use `scopedEvents` wherever `upcomingEvents` was rendered. Change the money section's guard from `canSeeMoney` to `canSeeSales`, wrap the "Lyante commission" tile in `{canSeeCommission && ( … )}`, and wrap any participants/staff tiles in `{canSeeCommission && ( … )}` since those are platform-wide counts. Change the heading subtitle to:

```tsx
        <p className="text-gray-500 text-sm">
          {scope ? 'Performance across your events' : 'All-time performance across every event'}
        </p>
```

- [ ] **Step 6: Gate the artist pages on `ARTIST_READ`**

In all five files under `admin/(panel)/artists/`, change `requirePageCapability('DASHBOARD_VIEW')` to `requirePageCapability('ARTIST_READ')`. Do the same for the three read gates in `src/app/api/artist/**` that currently use `DASHBOARD_VIEW` (`artist/[artistId]/route.ts:7`, `artist/[artistId]/music/route.ts:8`, `artist/[artistId]/music/[musicId]/route.ts:8`) and for `GET /api/artist` (`ARTIST_READ` in place of `DASHBOARD_VIEW`).

Note: `EventForm` fetches `/api/artist` to populate its artist picker; that form is `EVENT_WRITE`-only, so ADMIN still holds `ARTIST_READ` and the picker keeps working.

- [ ] **Step 7: Tell the scanner page what it may scan**

In `scanner/page.tsx`:

```ts
import { requirePageCapability } from '@/lib/rbac'
import { visibleEventIds } from '@/lib/eventAccess'
import { prisma } from '@/lib/prisma'
import { ScannerLoader } from '@/components/scanner/ScannerLoader'

export default async function ScannerPage() {
  const session = await requirePageCapability('TICKET_SCAN')
  const scope = await visibleEventIds(session)
  const scopedEvents = scope
    ? await prisma.event.findMany({
        where: { id: { in: scope } },
        select: { name: true },
        orderBy: { bookingDeadline: 'asc' },
      })
    : null

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scanner</h1>
        <p className="text-gray-500 text-sm mt-1">
          Scan a ticket QR code to check in the attendee. Only valid unused tickets will be
          accepted.
        </p>
        {scopedEvents && (
          <p className="text-sm text-gray-700 mt-2 rounded-md border border-black/10 bg-gray-50 px-3 py-2">
            {scopedEvents.length === 0
              ? 'You are not assigned to any event yet, so no ticket will be accepted.'
              : `Scanning for ${scopedEvents.map((e) => e.name).join(', ')}. Tickets for other events will be rejected.`}
          </p>
        )}
      </div>
      <ScannerLoader />
    </div>
  )
}
```

- [ ] **Step 8: Verify the whole suite and types**

Run: `npx vitest run tests src && npx tsc --noEmit`
Expected: all previously passing tests still pass; `tsc` clean.

- [ ] **Step 9: Commit**

```bash
git add "src/app/(control-center)" src/app/api/artist
git commit -m "feat(rbac): scope Control Center pages to the caller's events"
```

---

### Task 10: API routes — scope event-specific endpoints

**Files:**
- Modify: `src/app/api/events/[eventId]/analytics/route.ts:9`
- Modify: `src/app/api/events/[eventId]/tickets/route.ts:12`
- Modify: `src/app/api/events/[eventId]/route.ts` (PATCH/DELETE unchanged; add a comment)

**Interfaces:**
- Consumes: `requireEventApiCapability` (Task 5).

- [ ] **Step 1: Scope the analytics endpoint**

In `api/events/[eventId]/analytics/route.ts`, read `eventId` before the gate:

```ts
import { NextResponse } from 'next/server'
import { requireEventApiCapability } from '@/lib/eventAccess'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ eventId: string }> }

export async function GET(_req: Request, { params }: Params) {
  const { eventId } = await params
  const gate = await requireEventApiCapability('ANALYTICS_READ', eventId)
  if (gate instanceof NextResponse) return gate
```

Leave the body unchanged.

- [ ] **Step 2: Scope the ticket list**

In `api/events/[eventId]/tickets/route.ts`, the `GET` currently uses `DASHBOARD_VIEW` — the widest attendee-PII surface. Replace:

```ts
export async function GET(_req: Request, { params }: Params) {
  const { eventId } = await params
  // Attendee PII: EVENT_READ scoped to this event, so an organizer cannot read
  // another event's attendee list.
  const gate = await requireEventApiCapability('EVENT_READ', eventId)
  if (gate instanceof NextResponse) return gate
```

Leave `POST` on `TICKET_MANAGE` — ORGANIZER does not hold it.

- [ ] **Step 3: Document the public event endpoints**

In `api/events/[eventId]/route.ts`, above the `GET`, add:

```ts
// Public by design: the buyer-facing event page reads this. Event scoping
// applies to Control Center data (analytics, attendees, team), not to the
// public event record — see ARCHITECTURE §15.4.
```

- [ ] **Step 4: Verify**

Run: `npx vitest run tests src && npx tsc --noEmit`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/events
git commit -m "feat(rbac): scope event analytics and attendee endpoints"
```

---

### Task 11: Team API — assign and unassign organizers

**Files:**
- Create: `src/app/api/events/[eventId]/team/route.ts`
- Create: `src/app/api/events/[eventId]/team/[userId]/route.ts`
- Modify: `src/types/user.ts:11` (`assignableRoles`)
- Create: `src/types/team.ts`
- Test: `tests/api/team.test.ts`

**Interfaces:**
- Produces:
  - `GET /api/events/[eventId]/team` → `StaffUserDto[]`
  - `POST /api/events/[eventId]/team` body `{ userId }` **or** `{ name, email, password }` → `{ user, emailSent, password? }`
  - `DELETE /api/events/[eventId]/team/[userId]` → 204
  - `addTeamMemberSchema` in `src/types/team.ts`

- [ ] **Step 1: Add `ORGANIZER` to the assignable roles**

In `src/types/user.ts`:

```ts
export const assignableRoles = ['ADMIN', 'MANAGER', 'STAFF', 'ORGANIZER'] as const
```

- [ ] **Step 2: Write the request schema**

Create `src/types/team.ts`:

```ts
import { z } from 'zod'
import { MIN_STAFF_PASSWORD_LENGTH } from '@/types/user'

/**
 * Adding someone to an event's organizer team is either "assign this existing
 * account" or "create an organizer login and assign it". One endpoint, because
 * from the admin's point of view it is one action.
 */
export const addTeamMemberSchema = z.union([
  z.object({ userId: z.string().min(1) }),
  z.object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z
      .string()
      .min(MIN_STAFF_PASSWORD_LENGTH, `Password must be at least ${MIN_STAFF_PASSWORD_LENGTH} characters`)
      .max(200),
  }),
])

export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>
```

- [ ] **Step 3: Write the failing test**

Create `tests/api/team.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const requireApiCapability = vi.hoisted(() => vi.fn())
const assignmentFindMany = vi.hoisted(() => vi.fn())
const assignmentCreate = vi.hoisted(() => vi.fn())
const assignmentDeleteMany = vi.hoisted(() => vi.fn())
const userFindUnique = vi.hoisted(() => vi.fn())
const userCreate = vi.hoisted(() => vi.fn())
const eventFindUnique = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rbac', () => ({ requireApiCapability }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    eventAssignment: {
      findMany: assignmentFindMany,
      create: assignmentCreate,
      deleteMany: assignmentDeleteMany,
    },
    user: { findUnique: userFindUnique, create: userCreate },
    event: { findUnique: eventFindUnique },
  },
}))
vi.mock('@/lib/email', () => ({
  isEmailEnabled: () => false,
  sendStaffCredentialsEmail: vi.fn(),
}))

import { GET, POST } from '@/app/api/events/[eventId]/team/route'
import { DELETE } from '@/app/api/events/[eventId]/team/[userId]/route'

const params = { params: Promise.resolve({ eventId: 'e1' }) }
const ok = { session: { user: { id: 'admin1', role: 'ADMIN' } } }
const post = (body: unknown) =>
  POST(new Request('http://localhost/api/events/e1/team', {
    method: 'POST',
    body: JSON.stringify(body),
  }), params)

describe('organizer team API', () => {
  beforeEach(() => {
    requireApiCapability.mockReset().mockResolvedValue(ok)
    assignmentFindMany.mockReset()
    assignmentCreate.mockReset()
    assignmentDeleteMany.mockReset()
    userFindUnique.mockReset()
    userCreate.mockReset()
    eventFindUnique.mockReset().mockResolvedValue({ id: 'e1' })
  })

  it('requires USER_MANAGE', async () => {
    requireApiCapability.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    )
    const res = await GET(new Request('http://localhost'), params)
    expect(res.status).toBe(403)
    expect(requireApiCapability).toHaveBeenCalledWith('USER_MANAGE')
  })

  it('lists current members without password fields', async () => {
    assignmentFindMany.mockResolvedValue([
      {
        user: {
          id: 'u1', name: 'R', email: 'r@x.co', role: 'ORGANIZER',
          deletedAt: null, createdAt: new Date('2026-01-01'),
        },
      },
    ])
    const res = await GET(new Request('http://localhost'), params)
    const body = await res.json()
    expect(body[0].id).toBe('u1')
    expect(body[0]).not.toHaveProperty('password')
  })

  it('assigns an existing user', async () => {
    userFindUnique.mockResolvedValue({
      id: 'u1', name: 'R', email: 'r@x.co', role: 'ORGANIZER',
      deletedAt: null, createdAt: new Date('2026-01-01'),
    })
    const res = await post({ userId: 'u1' })
    expect(res.status).toBe(201)
    expect(assignmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: 'u1', eventId: 'e1' } }),
    )
  })

  it('404s when the event does not exist', async () => {
    eventFindUnique.mockResolvedValue(null)
    const res = await post({ userId: 'u1' })
    expect(res.status).toBe(404)
  })

  it('creates an ORGANIZER account when given credentials', async () => {
    userCreate.mockResolvedValue({
      id: 'u2', name: 'S', email: 's@x.co', role: 'ORGANIZER',
      deletedAt: null, createdAt: new Date('2026-01-01'),
    })
    const res = await post({ name: 'S', email: 's@x.co', password: 'longenough1' })
    expect(res.status).toBe(201)
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'ORGANIZER' }) }),
    )
    // Mail is disabled, so the password comes back for the admin to pass on.
    expect((await res.json()).password).toBe('longenough1')
  })

  it('rejects a short password', async () => {
    const res = await post({ name: 'S', email: 's@x.co', password: 'short' })
    expect(res.status).toBe(422)
  })

  it('unassigns a member', async () => {
    assignmentDeleteMany.mockResolvedValue({ count: 1 })
    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ eventId: 'e1', userId: 'u1' }),
    })
    expect(res.status).toBe(204)
    expect(assignmentDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', eventId: 'e1' },
    })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/api/team.test.ts`
Expected: FAIL — the route modules do not exist.

- [ ] **Step 5: Write the collection route**

Create `src/app/api/events/[eventId]/team/route.ts`:

```ts
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { toStaffUserDto } from '@/lib/users'
import { addTeamMemberSchema } from '@/types/team'
import { isEmailEnabled, sendStaffCredentialsEmail } from '@/lib/email'

type Params = { params: Promise<{ eventId: string }> }

/** Columns safe to return. Explicit so the password hash can never leak. */
const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  deletedAt: true,
  createdAt: true,
} as const

export async function GET(_request: Request, { params }: Params) {
  const gate = await requireApiCapability('USER_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { eventId } = await params
  const rows = await prisma.eventAssignment.findMany({
    where: { eventId },
    select: { user: { select: SAFE_SELECT } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(rows.map((r) => toStaffUserDto(r.user)))
}

/**
 * Adds someone to the event's organizer team — either an existing account or a
 * brand-new ORGANIZER login created here, because "add a team member" is one
 * action from the admin's side.
 */
export async function POST(request: Request, { params }: Params) {
  const gate = await requireApiCapability('USER_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { eventId } = await params
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const parsed = addTeamMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  let user
  let plainPassword: string | undefined

  if ('userId' in parsed.data) {
    user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: SAFE_SELECT,
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  } else {
    const { name, email, password } = parsed.data
    plainPassword = password
    try {
      user = await prisma.user.create({
        data: { name, email, password: await bcrypt.hash(password, 12), role: 'ORGANIZER' },
        select: SAFE_SELECT,
      })
    } catch (e) {
      // P2002 = unique constraint. Relying on the DB keeps this race-free.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      }
      throw e
    }
  }

  try {
    await prisma.eventAssignment.create({ data: { userId: user.id, eventId } })
  } catch (e) {
    // Already on the team — treat as success so a double submit is harmless.
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e
  }

  // Delivery is best-effort: the account and assignment already exist, so a
  // mail failure must not fail the request. When mail does not go out we hand
  // the password back so the admin can pass it on.
  let emailSent = false
  if (plainPassword && isEmailEnabled()) {
    try {
      await sendStaffCredentialsEmail({
        to: user.email,
        name: user.name,
        role: user.role,
        password: plainPassword,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin/login`,
      })
      emailSent = true
    } catch (err) {
      console.error('Organizer credentials email failed:', err)
    }
  }

  return NextResponse.json(
    {
      user: toStaffUserDto(user),
      emailSent,
      password: emailSent ? undefined : plainPassword,
    },
    { status: 201 },
  )
}
```

- [ ] **Step 6: Write the member route**

Create `src/app/api/events/[eventId]/team/[userId]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ eventId: string; userId: string }> }

/**
 * Removes one member's access to one event. `deleteMany` rather than `delete`
 * so removing an assignment that is already gone is a no-op, not a 500.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const gate = await requireApiCapability('USER_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { eventId, userId } = await params
  await prisma.eventAssignment.deleteMany({ where: { userId, eventId } })

  return new NextResponse(null, { status: 204 })
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run tests/api/team.test.ts && npx tsc --noEmit`
Expected: PASS (7 tests), `tsc` clean.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/events/\[eventId\]/team src/types/team.ts src/types/user.ts tests/api/team.test.ts
git commit -m "feat(rbac): add organizer team assignment endpoints"
```

---

### Task 12: Team panel on the event page

**Files:**
- Create: `src/components/events/OrganizerTeamPanel.tsx`
- Modify: `src/app/(control-center)/(dashboard)/admin/(panel)/events/[eventId]/page.tsx` (render the panel)

**Interfaces:**
- Consumes: the Task 11 endpoints; `StaffUserDto` from `@/types/user`.
- Produces: `<OrganizerTeamPanel eventId={string} initialMembers={StaffUserDto[]} />`

- [ ] **Step 1: Write the component**

Create `src/components/events/OrganizerTeamPanel.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { StaffUserDto } from '@/types/user'

/**
 * Admin-only panel for the event's organizer team. Rendered behind
 * USER_MANAGE — the API enforces the same capability, so hiding it is
 * cosmetic.
 */
export function OrganizerTeamPanel({
  eventId,
  initialMembers,
}: {
  eventId: string
  initialMembers: StaffUserDto[]
}) {
  const router = useRouter()
  const [members, setMembers] = useState(initialMembers)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  /** Shown once when mail is disabled — otherwise the password is unrecoverable. */
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setIssuedPassword(null)

    const form = new FormData(e.currentTarget)
    const res = await fetch(`/api/events/${eventId}/team`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name') as string,
        email: form.get('email') as string,
        password: form.get('password') as string,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      setMembers((m) => [...m, data.user])
      if (data.password) setIssuedPassword(data.password)
      setAdding(false)
      router.refresh()
    } else {
      let message = 'Failed to add team member'
      try {
        const data = await res.json()
        if (typeof data.error === 'string') message = data.error
      } catch {}
      setError(message)
    }
    setLoading(false)
  }

  async function handleRemove(userId: string) {
    const res = await fetch(`/api/events/${eventId}/team/${userId}`, { method: 'DELETE' })
    if (res.ok) {
      setMembers((m) => m.filter((x) => x.id !== userId))
      router.refresh()
    } else {
      setError('Failed to remove team member')
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Organizer team</h2>
          <p className="text-xs text-gray-500">
            Read-only access to this event, plus ticket scanning for it.
          </p>
        </div>
        {!adding && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <UserPlus size={14} className="mr-1.5" />
            Add member
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-gray-500">No organizer accounts on this event yet.</p>
      ) : (
        <ul className="divide-y">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate">
                  {m.name}
                  {!m.active && <span className="text-xs text-red-600 ml-2">deactivated</span>}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {m.email} · {m.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(m.id)}
                className="text-gray-400 hover:text-red-600 p-1.5 rounded-md transition-colors"
                aria-label={`Remove ${m.name}`}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {issuedPassword && (
        <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Email is disabled, so pass this on now — it cannot be shown again:{' '}
          <span className="font-mono font-semibold">{issuedPassword}</span>
        </p>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="mt-3 space-y-3 border-t pt-3">
          <div className="space-y-1">
            <Label htmlFor="team-name">Name</Label>
            <Input id="team-name" name="name" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="team-email">Email</Label>
            <Input id="team-email" name="email" type="email" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="team-password">Temporary password</Label>
            <Input id="team-password" name="password" type="text" minLength={8} required />
            <p className="text-xs text-gray-500">
              At least 8 characters. There is no reset flow yet, so record it.
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Adding…' : 'Add to team'}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && !adding && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Render it on the event page**

In `events/[eventId]/page.tsx`, load the members alongside the tickets query:

```ts
  const teamMembers = hasCapability(session.user.role, 'USER_MANAGE')
    ? await prisma.eventAssignment.findMany({
        where: { eventId },
        select: {
          user: {
            select: {
              id: true, name: true, email: true, role: true,
              deletedAt: true, createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      })
    : []
```

and render above the `Tickets` heading:

```tsx
      {hasCapability(session.user.role, 'USER_MANAGE') && (
        <div className="mb-6">
          <OrganizerTeamPanel
            eventId={eventId}
            initialMembers={teamMembers.map((t) => toStaffUserDto(t.user))}
          />
        </div>
      )}
```

Import `OrganizerTeamPanel` and `toStaffUserDto`.

- [ ] **Step 3: Verify**

Run: `npx vitest run tests src && npx tsc --noEmit`
Expected: PASS, clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/events/OrganizerTeamPanel.tsx "src/app/(control-center)"
git commit -m "feat(rbac): add the organizer team panel to the event page"
```

---

### Task 13: Navigation and scanner UI

**Files:**
- Modify: `src/components/layout/adminNavLinks.ts:20`
- Modify: `src/components/scanner/ScannerClient.tsx`
- Test: `tests/components/adminNavLinks.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `tests/components/adminNavLinks.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { navLinksFor } from '@/components/layout/adminNavLinks'

const hrefs = (role: Parameters<typeof navLinksFor>[0]) => navLinksFor(role).map((l) => l.href)

describe('navLinksFor', () => {
  it('gives ORGANIZER only dashboard, events and scanner', () => {
    expect(hrefs('ORGANIZER')).toEqual(['/admin/dashboard', '/admin/events', '/admin/scanner'])
  })

  it('leaves ADMIN with every link', () => {
    expect(hrefs('ADMIN')).toEqual([
      '/admin/dashboard',
      '/admin/events',
      '/admin/scanner',
      '/admin/artists',
      '/admin/users',
    ])
  })

  it('keeps artists visible to STAFF and MANAGER', () => {
    expect(hrefs('STAFF')).toContain('/admin/artists')
    expect(hrefs('MANAGER')).toContain('/admin/artists')
  })

  it('still hides the scanner from MANAGER', () => {
    expect(hrefs('MANAGER')).not.toContain('/admin/scanner')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/adminNavLinks.test.ts`
Expected: FAIL — ORGANIZER currently also sees `/admin/artists`.

- [ ] **Step 3: Tag the Artists link**

In `src/components/layout/adminNavLinks.ts`:

```ts
  { href: '/admin/artists', label: 'Artists', icon: Music, cap: 'ARTIST_READ' },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/adminNavLinks.test.ts`
Expected: PASS.

- [ ] **Step 5: Render the wrong-event scan result**

In `src/components/scanner/ScannerClient.tsx`, extend the `ScanResult` union:

```ts
type ScanResult =
  | { valid: true; attendeeName: string | null; distributorName: string | null; category: string; eventName: string }
  | { valid: false; reason: 'NOT_FOUND' | 'CANCELLED' | 'ALREADY_USED'; usedAt?: string }
  | { valid: false; reason: 'WRONG_EVENT'; eventName: string }
```

and add a branch to the failure rendering, matching the existing failure-state markup:

```tsx
        {result.reason === 'WRONG_EVENT' && (
          <>
            <p className="font-semibold">Wrong event</p>
            <p className="text-sm">
              This ticket is for {result.eventName}. It has not been checked in.
            </p>
          </>
        )}
```

- [ ] **Step 6: Verify**

Run: `npx vitest run tests src && npx tsc --noEmit`
Expected: PASS, clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/adminNavLinks.ts src/components/scanner/ScannerClient.tsx tests/components/adminNavLinks.test.ts
git commit -m "feat(rbac): scope admin nav and surface wrong-event scans"
```

---

### Task 14: End-to-end authorization sweep

**Files:**
- Create: `tests/api/organizer-authorization.test.ts`
- Modify: `vitest.config.ts` (exclude the stale worktree copy of the suite)

**Interfaces:**
- Consumes: every gate built above.

- [ ] **Step 1: Stop the stale worktree suite from polluting runs**

In `vitest.config.ts`, add to the `test` block:

```ts
    // `.claude/worktrees/` holds checkouts of this same repo; without this,
    // every run executes a second, stale copy of the suite and reports its
    // pre-existing failures as ours.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
```

- [ ] **Step 2: Write the sweep**

Create `tests/api/organizer-authorization.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

/**
 * End-to-end authorization sweep for the ORGANIZER role.
 *
 * Drives the real gates (`rbac.ts` + `eventAccess.ts`) against a mocked
 * database, so a capability-map or scoping regression fails here rather than in
 * production. The assertion is deliberately blunt: for each role and each
 * protected surface, allowed or not.
 */

const mockGetServerSession = vi.hoisted(() => vi.fn())
const assignmentFindMany = vi.hoisted(() => vi.fn())

vi.mock('next-auth/next', () => ({ getServerSession: mockGetServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  prisma: { eventAssignment: { findMany: assignmentFindMany } },
}))

import { requireApiCapability } from '@/lib/rbac'
import { requireEventApiCapability } from '@/lib/eventAccess'

const ASSIGNED = 'event-assigned'
const OTHER = 'event-other'

function signIn(role: string) {
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role } })
  assignmentFindMany.mockResolvedValue(role === 'ORGANIZER' ? [{ eventId: ASSIGNED }] : [])
}

const allowed = (r: unknown) => !(r instanceof NextResponse)

describe('ORGANIZER — authorization sweep', () => {
  beforeEach(() => {
    mockGetServerSession.mockReset()
    assignmentFindMany.mockReset()
  })

  describe('own event', () => {
    beforeEach(() => signIn('ORGANIZER'))

    it('reads the event record', async () =>
      expect(allowed(await requireEventApiCapability('EVENT_READ', ASSIGNED))).toBe(true))

    it('reads analytics', async () =>
      expect(allowed(await requireEventApiCapability('ANALYTICS_READ', ASSIGNED))).toBe(true))

    it('reads its own sales figures', async () =>
      expect(allowed(await requireEventApiCapability('SALES_READ', ASSIGNED))).toBe(true))

    it('scans its tickets', async () =>
      expect(allowed(await requireEventApiCapability('TICKET_SCAN', ASSIGNED))).toBe(true))

    it('cannot edit it', async () =>
      expect(allowed(await requireEventApiCapability('EVENT_WRITE', ASSIGNED))).toBe(false))

    it('cannot issue tickets for it', async () =>
      expect(allowed(await requireEventApiCapability('TICKET_MANAGE', ASSIGNED))).toBe(false))

    it('cannot see commission figures', async () =>
      expect(allowed(await requireEventApiCapability('FINANCE_READ', ASSIGNED))).toBe(false))
  })

  describe('someone else’s event', () => {
    beforeEach(() => signIn('ORGANIZER'))

    for (const cap of ['EVENT_READ', 'ANALYTICS_READ', 'SALES_READ', 'TICKET_SCAN'] as const) {
      it(`is denied ${cap}`, async () =>
        expect(allowed(await requireEventApiCapability(cap, OTHER))).toBe(false))
    }
  })

  describe('platform-wide surfaces', () => {
    beforeEach(() => signIn('ORGANIZER'))

    for (const cap of [
      'USER_MANAGE', 'ARTIST_MANAGE', 'ARTIST_READ', 'EVENT_WRITE',
      'TICKET_MANAGE', 'MARKETING_MANAGE', 'FINANCE_READ',
    ] as const) {
      it(`is denied ${cap}`, async () =>
        expect(allowed(await requireApiCapability(cap))).toBe(false))
    }
  })

  describe('unauthenticated', () => {
    it('401s on a scoped route', async () => {
      mockGetServerSession.mockResolvedValue(null)
      const r = await requireEventApiCapability('EVENT_READ', ASSIGNED)
      expect((r as NextResponse).status).toBe(401)
    })
  })

  describe('regression — existing roles keep their reach', () => {
    it('ADMIN reaches every event and capability', async () => {
      signIn('ADMIN')
      expect(allowed(await requireEventApiCapability('EVENT_READ', OTHER))).toBe(true)
      expect(allowed(await requireEventApiCapability('EVENT_WRITE', OTHER))).toBe(true)
      expect(allowed(await requireApiCapability('FINANCE_READ'))).toBe(true)
      expect(allowed(await requireApiCapability('USER_MANAGE'))).toBe(true)
    })

    it('STAFF still reads any event and scans any ticket', async () => {
      signIn('STAFF')
      expect(allowed(await requireEventApiCapability('EVENT_READ', OTHER))).toBe(true)
      expect(allowed(await requireEventApiCapability('TICKET_SCAN', OTHER))).toBe(true)
      expect(allowed(await requireApiCapability('EVENT_WRITE'))).toBe(false)
      expect(allowed(await requireApiCapability('SALES_READ'))).toBe(false)
    })

    it('MANAGER keeps analytics and marketing, still no scanning', async () => {
      signIn('MANAGER')
      expect(allowed(await requireEventApiCapability('ANALYTICS_READ', OTHER))).toBe(true)
      expect(allowed(await requireApiCapability('MARKETING_MANAGE'))).toBe(true)
      expect(allowed(await requireApiCapability('TICKET_SCAN'))).toBe(false)
    })

    it('USER and PARTICIPANT reach nothing in the Control Center', async () => {
      for (const role of ['USER', 'PARTICIPANT']) {
        signIn(role)
        expect(allowed(await requireApiCapability('DASHBOARD_VIEW'))).toBe(false)
        expect(allowed(await requireEventApiCapability('EVENT_READ', ASSIGNED))).toBe(false)
      }
    })
  })
})
```

- [ ] **Step 3: Run the sweep**

Run: `npx vitest run tests/api/organizer-authorization.test.ts`
Expected: PASS — roughly 30 assertions.

- [ ] **Step 4: Run everything**

Run: `npx vitest run && npx tsc --noEmit && npm run build`
Expected: full suite green (the worktree copy is now excluded), types clean, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add tests/api/organizer-authorization.test.ts vitest.config.ts
git commit -m "test(rbac): end-to-end authorization sweep for organizer scope"
```

---

### Task 15: Documentation

**Files:**
- Modify: `ARCHITECTURE.md` §5, §6, §8, §15

- [ ] **Step 1: Update the identity section (§5)**

Add `ORGANIZER` to the `session.user.role` row of the staff/buyer table, and add a paragraph:

```markdown
- **`ORGANIZER` is an event-scoped staff role.** It holds read capabilities and
  `TICKET_SCAN`, but only for events listed in `EventAssignment`. Scope is
  enforced by `src/lib/eventAccess.ts`; the pure predicate lives in
  `src/lib/eventScope.ts` so the edge proxy and client components can use it.
```

- [ ] **Step 2: Update the RBAC section (§6)**

Replace the capability block with the current `CAPABILITY` map, and add:

```markdown
**Event scoping (the second dimension).** `hasCapability` answers "may this
role do X?"; `canAccessEvent` (in `src/lib/eventScope.ts`, pure) answers "…to
THIS event?". Server gates combine both:

- `requireEventApiCapability(cap, eventId)` — route handlers, 401/403.
- `requireEventPageCapability(cap, eventId)` — server components; an
  out-of-scope organizer is redirected to `/admin/events`.
- `visibleEventIds(session)` — `null` means every event; an array confines a
  list query.

These live in `src/lib/eventAccess.ts`, **not** `rbac.ts`, because `rbac.ts` is
bundled into `proxy.ts` (edge) and client components and must stay Prisma-free.

The proxy blocks cross-event `/admin/events/<id>` URLs using event ids carried
in the JWT — coarse and possibly seconds stale, exactly like role revocation.
The page/route gate re-reads the database and is the authority.
```

- [ ] **Step 3: Update the data model section (§8)**

Correct the `User` line — it now has a relation — and add:

```markdown
- **EventAssignment** — grants one staff account access to one event
  (`@@unique([userId, eventId])`). Cascades on both sides; the event-side
  cascade is required because events are hard-deleted.
```

Add `ORGANIZER` to the `Role` enum list.

- [ ] **Step 4: Add the new landmines (§15)**

```markdown
13. **`src/lib/rbac.ts` and `src/lib/eventScope.ts` must never import Prisma or
    `next/headers`.** Both are bundled into `src/proxy.ts` (edge) and into
    client components. DB-backed scoping belongs in `src/lib/eventAccess.ts`.
14. **`getEventPeerComparison` returns other events by name with their net
    revenue.** It is `FINANCE_READ`-only and must be skipped server-side for
    anyone else — including in the analytics PDF input — or an organizer sees
    every other event's takings.
15. **Scope-check before mutating in `verifyTicket`.** A wrong-event scan must
    return `WRONG_EVENT` without consuming the attendee's ticket.
```

- [ ] **Step 5: Commit**

```bash
git add ARCHITECTURE.md
git commit -m "docs(rbac): document event-scoped organizer roles"
```

---

## Self-Review

**Spec coverage:** §1 data model → Task 1. §2 capability matrix → Task 3. §3 module layout → Tasks 2, 5. §4 JWT/session → Task 4. §5 middleware → Task 6. §6 server enforcement → Tasks 9, 10 (with §6's peer-comparison hazard in Task 9 Step 4 and the `DASHBOARD_VIEW` hazard covered by shipping Tasks 3–10 together). §7 scanning → Tasks 7, 13. §8 team management → Tasks 11, 12. §9 front end → Task 13. §10 scope boundary → Task 10 Step 3 (comment) and Task 15. §11 testing → Tasks 2, 3, 4, 5, 6, 7, 8, 11, 13, 14. §12 documentation → Task 15. No gaps.

**Type consistency:** `canAccessEvent(role, assignedEventIds, eventId)` and `isEventScopedRole(role)` are used with those exact signatures in Tasks 4, 5, 6. `visibleEventIds` returns `string[] | null` and is consumed as such in Tasks 7, 9. `verifyTicket(token, allowedEventIds?)` matches its call in Task 7 Step 4. `requireEventApiCapability` / `requireEventPageCapability` signatures match every call site in Tasks 9, 10, 14. `toStaffUserDto` is reused unchanged in Tasks 11, 12.

**Ordering constraint:** Task 3 grants `DASHBOARD_VIEW` to `ORGANIZER`, which is what lets the role past the proxy. Tasks 3 through 10 must land together before any `ORGANIZER` account exists in a deployed database. Task 11 is the first task that can create one, and it comes after — deliberately.
