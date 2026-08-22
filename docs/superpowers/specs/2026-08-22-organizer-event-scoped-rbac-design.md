# Organizer Team — Event-Scoped RBAC — Design

**Date:** 2026-08-22
**Status:** Approved, pending implementation
**Branch:** `feat/organizer-event-scoped-rbac` off `main`

## Goal

Let an event organizer's team log into the Control Center with **read access to
their own event only**, plus the ability to **scan tickets for that event
only**. Every other event's CRM data must be unreachable — list, detail,
analytics, attendee PII and scanning alike.

This adds a second authorization dimension. Today RBAC answers *"may this role
do X?"*; it must now also answer *"may this role do X **to this event**?"*

## Context (current state on `main`)

- `src/lib/rbac.ts` is a flat `CAPABILITY` map (capability → roles) plus
  `hasCapability` / `requireApiCapability` / `requirePageCapability` /
  `requireSession`. No notion of a resource.
- `src/proxy.ts` (Next 16 middleware) gates `/admin/*` on `DASHBOARD_VIEW`
  using `getToken`, which **decodes** the cookie and runs no callbacks and no
  Prisma. Real enforcement is at the page/route gate — ARCHITECTURE §6.
- `rbac.ts` is imported by `proxy.ts` (edge) and by client components
  (`hasCapability`). It must stay free of Prisma and `next/headers`; this is
  why `requireSession` dynamic-imports `jose` (ARCHITECTURE §7).
- Every admin page reads Prisma directly and assumes staff see all events.
- `POST /api/verify/[token]` checks `TICKET_SCAN`, then checks in **any**
  ticket. Nothing ties a scanner to an event.
- `User` has no relations to any other model (ARCHITECTURE §8). This design
  changes that.

## Approved decisions

| Question | Decision |
|---|---|
| Account → event mapping | Many-to-many `EventAssignment` join table; role stays on `User` |
| Money visibility | Sales yes (gross/net/refunds for their event), Lyante commission no |
| Edge enforcement | Assigned event ids ride in the JWT so the proxy can block cross-event URLs; the server gate re-checks the DB and is authoritative |
| Team management UI | On the event page; the user page shows assignments read-only |

## 1. Data model

```prisma
enum Role { ADMIN  STAFF  MANAGER  USER  ORGANIZER }

model EventAssignment {
  id        String   @id @default(cuid())
  userId    String
  eventId   String
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId],  references: [id], onDelete: Cascade)
  event     Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  @@unique([userId, eventId])
  @@index([userId])
}
```

`User` and `Event` gain `assignments EventAssignment[]`.

**Two migrations**, per ARCHITECTURE §14 — Postgres forbids *using* a new enum
value in the transaction that adds it:

1. `..._add_organizer_role_enum_value` — `ALTER TYPE "Role" ADD VALUE 'ORGANIZER';`
2. `..._create_event_assignment` — the table, its unique constraint and indexes.

`onDelete: Cascade` on the event side is **required, not cosmetic**:
`DELETE /api/events/[eventId]` hard-deletes events, and a restricting FK would
begin failing. Users are only ever soft-deleted (`deletedAt`), so the user-side
cascade never fires in practice; it is there for correctness.

## 2. Capability matrix

| Capability | ADMIN | STAFF | MANAGER | ORGANIZER | Notes |
|---|:-:|:-:|:-:|:-:|---|
| `DASHBOARD_VIEW` | ✓ | ✓ | ✓ | ✓ | Shell access; **scoped** for ORGANIZER |
| `EVENT_READ` *(new)* | ✓ | ✓ | ✓ | ✓ | Event detail; scoped for ORGANIZER |
| `ANALYTICS_READ` | ✓ | ✓ | ✓ | ✓ | Volume metrics; scoped for ORGANIZER |
| `TICKET_SCAN` | ✓ | ✓ | — | ✓ | Check-in; scoped for ORGANIZER |
| `SALES_READ` *(new)* | ✓ | — | — | ✓ | Gross / net / refunds for one event |
| `FINANCE_READ` | ✓ | — | — | — | Commission rate + income, platform totals, peer data |
| `ARTIST_READ` *(new)* | ✓ | ✓ | ✓ | — | Artist pages + nav link visibility |
| `EVENT_WRITE` | ✓ | — | — | — | |
| `TICKET_MANAGE` | ✓ | — | — | — | |
| `ARTIST_MANAGE` | ✓ | — | — | — | |
| `MARKETING_MANAGE` | ✓ | — | ✓ | — | |
| `USER_MANAGE` | ✓ | — | — | — | Includes organizer team assignment |

Splitting the old ADMIN-only `FINANCE_READ` into `SALES_READ` (the organizer's
own money) and `FINANCE_READ` (Lyante's margin and anything cross-event) is
what delivers the *sales yes, commission no* decision. No existing role's
effective permissions change: ADMIN holds both halves; STAFF and MANAGER held
neither before and hold neither now.

`ARTIST_READ` exists so the Artists nav link can be hidden from ORGANIZER by
**capability rather than a hardcoded role string**, keeping the repo's "check
capabilities, never role strings" convention. STAFF/MANAGER visibility is
unchanged.

## 3. Module layout

`rbac.ts` must not import Prisma (it is bundled into the edge proxy and client
components). Scoping therefore splits across two new modules:

- **`src/lib/eventScope.ts`** — pure, edge- and client-safe.
  - `EVENT_SCOPED_CAPABILITIES` — the set that is meaningless without an event id.
  - `isEventScopedRole(role)` — currently `role === 'ORGANIZER'`.
  - `canAccessEvent(role, assignedIds, eventId)` — the one scoping predicate,
    used by the proxy, the server gates and the FE alike.
  - Unscoped roles return `true` for any event; scoped roles require membership.

- **`src/lib/eventAccess.ts`** — the Prisma half.
  - `assignedEventIds(userId)` — assignment lookup.
  - `visibleEventIds(session)` → `string[] | null`, where **`null` means all
    events** (ADMIN/STAFF/MANAGER). List queries spread it into a `where`.
  - `requireEventPageCapability(cap, eventId)` → `Session`, redirecting.
  - `requireEventApiCapability(cap, eventId)` → `{ session } | NextResponse`.

Both gates re-read assignments from the database, so they are authoritative
even when the JWT is stale.

## 4. JWT & session

The `jwt` callback already re-reads the staff row on every refresh. It gains an
assignment lookup **only when the refreshed role is `ORGANIZER`**, so no other
role pays a query. A deactivated account collapses to `role: 'USER'` and
`eventIds: []`, exactly as the existing live-revocation path does.

`session` copies `eventIds` onto `session.user`. `src/types/next-auth.d.ts`
extends `Session`, `User` and `JWT` with `ORGANIZER` and `eventIds`.

## 5. Middleware (`src/proxy.ts`)

```
/admin/login                     → passthrough (unchanged; never move it inside (panel))
!DASHBOARD_VIEW                  → /admin/login (unchanged)

role === ORGANIZER:
  /admin/users*                  → deny
  /admin/artists*                → deny
  /admin/events/new              → deny
  /admin/events/<id>/edit        → deny
  /admin/events/<id>/tickets/new → deny
  /admin/events/<id>*            → allow iff canAccessEvent(role, token.eventIds, id)
  /admin/dashboard               → allow (scoped page)
  /admin/scanner                 → allow (scoped scanner)
  /admin/events                  → allow (scoped list)
denial target: /admin/events     (allowed for ORGANIZER, so the guard cannot loop)
```

The edge stays coarse and may be seconds stale after an assignment change;
§6 is the authority. This matches the posture ARCHITECTURE §6 already documents
for role revocation.

## 6. Server-side enforcement

| Surface | Change |
|---|---|
| `/admin/dashboard` | `getPlatformAnalytics(eventIds?)` — organizer sees their events only, sales tiles yes, commission tiles no |
| `/admin/events` | list filtered through `visibleEventIds` |
| `/admin/events/[id]` | `requireEventPageCapability('EVENT_READ', id)`; manage/generate buttons already capability-gated |
| `/admin/events/[id]/analytics` | scoped; `canSeeMoney` splits into `canSeeSales` / `canSeeCommission`; peer comparison gated on `FINANCE_READ` |
| `/admin/events/[id]/edit`, `/tickets/new` | unchanged — `EVENT_WRITE` / `TICKET_MANAGE` already exclude ORGANIZER |
| `/admin/scanner` | allowed; scanner is told which events it may scan |
| `/admin/artists*` | `ARTIST_READ` instead of `DASHBOARD_VIEW` |
| `GET /api/events/[eventId]/analytics` | `requireEventApiCapability('ANALYTICS_READ', eventId)` |
| `GET /api/events/[eventId]/tickets` | `requireEventApiCapability('EVENT_READ', eventId)` — widest attendee-PII hole today |
| `POST /api/verify/[token]` | §7 |
| `GET /api/events`, `GET /api/events/[eventId]` | **untouched** — public, uncached-by-role endpoints serving the public site |

### Two hazards this section exists to close

**`getEventPeerComparison` is a live cross-event leak.** It returns every event
by **name with its net revenue**, and it renders on the analytics page an
organizer is now allowed to open. It must be skipped server-side for callers
without `FINANCE_READ`, so the data never reaches the client payload or the PDF
exporter.

**`DASHBOARD_VIEW` is what lets ORGANIZER past the proxy at all.** Until the
page gates in this section land, every page gated only on `DASHBOARD_VIEW` is
reachable by them. The migration, the capability map and the page gates must
ship together; they are not separable increments.

## 7. Scanning

```ts
verifyTicket(token, allowedEventIds?: string[] | null)
// null / omitted  → unrestricted (ADMIN, STAFF — unchanged behaviour)
// string[]        → the ticket's eventId must be a member
```

New result variant:

```ts
| { valid: false; reason: 'WRONG_EVENT'; eventName: string }
```

The scope check runs **before** the check-in mutation inside the existing
transaction, so a wrong-event scan can never consume a ticket.
`/api/verify/[token]` resolves the caller's scope via `visibleEventIds` and
passes it. `ScannerClient` renders the new state and names the event(s) it is
scanning for.

## 8. Organizer team management

- `GET /api/events/[eventId]/team` — list members.
- `POST /api/events/[eventId]/team` — assign an existing user **or** create an
  ORGANIZER login inline from `{ name, email, password }`, reusing the existing
  best-effort credentials email (returns the password when mail is disabled, as
  `POST /api/users` already does).
- `DELETE /api/events/[eventId]/team/[userId]` — unassign.

All three gated on `USER_MANAGE` (admin only). FE: an `OrganizerTeamPanel` on
the event detail page, rendered only for `USER_MANAGE`. `assignableRoles` gains
`ORGANIZER`, and `/admin/users` shows an assignment count so an ORGANIZER with
zero events is visibly inert rather than mysteriously empty.

## 9. Front end

`navLinksFor` for ORGANIZER resolves to Dashboard, Events, Scanner. Artists
disappears via `ARTIST_READ`; Users via the existing `USER_MANAGE`. The sidebar
role badge shows `ORGANIZER`.

## 10. Scope boundary (stated deliberately)

"No other event data at all" applies to the **Control Center**. An organizer
signed into the CRM can still browse other events on the **public** site
(`/events`, `GET /api/events`) exactly as any anonymous visitor can — that data
is public by design, and gating it would trip ARCHITECTURE §15.4 (never gate
`(public)` / `(marketing)` behind a capability).

## 11. Testing

- `tests/lib/eventScope.test.ts` — `canAccessEvent` matrix across roles.
- `tests/lib/rbac.test.ts` — ORGANIZER holds `EVENT_READ`, `ANALYTICS_READ`,
  `TICKET_SCAN`, `SALES_READ`, `DASHBOARD_VIEW`; lacks `EVENT_WRITE`,
  `TICKET_MANAGE`, `USER_MANAGE`, `ARTIST_READ`, `FINANCE_READ`,
  `MARKETING_MANAGE`. Existing roles' rows unchanged (regression).
- `tests/proxy.test.ts` — organizer allowed on an assigned event path, denied
  on another event, denied on `/admin/users`; existing role cases unchanged.
- `tests/lib/verify.test.ts` — `WRONG_EVENT` returns without mutating; an
  in-scope scan still checks in; unrestricted callers unaffected.
- `tests/api/organizer-access.test.ts` — end-to-end authorization sweep over
  the scoped API routes for each role.

## 12. Documentation

ARCHITECTURE.md needs updating in §5 (role table), §6 (RBAC + the new scoped
gates), §8 (`User` now *does* have a relation; new model and enum value) and
§15 (new landmines: `rbac.ts` stays Prisma-free; peer comparison is
`FINANCE_READ`-only).
