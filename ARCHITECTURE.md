# Architecture & Agent Context

> **Read this before touching code.** It is the mental model for this repo so you don't have to skim the whole tree. Pair it with `AGENTS.md` (framework caveat) and `CLAUDE.md`. When something here disagrees with the code, the code wins — update this file.

---

## 1. What this is

**Lyante Production** — a creative event-production agency marketing site **plus** a full event-ticketing platform. One Next.js app, deployed to **lyante.art** on Vercel. Two audiences share the codebase:

- **Public / buyers** — browse events, buy tickets (Khalti payment), view/download their tickets.
- **Staff / admin** — a CRM-style "Control Center" to manage events, artists, tickets, scanning, and analytics.

There is also a sibling site (`amit-jung-site`, deployed to `amit.lyante.art`) referenced by the `*:amit` npm scripts — a separate satellite, not the main app.

---

## 2. Tech stack

| Area | Choice | Notes |
|------|--------|-------|
| Framework | **Next.js 16** (App Router) | ⚠️ See §3. Middleware is **`src/proxy.ts`**, not `middleware.ts`. |
| React | 19 | Server Components by default. |
| DB | **PostgreSQL (Neon)** via **Prisma 6** | `src/lib/prisma.ts` singleton. |
| Auth | **NextAuth v4** (JWT sessions) | Credentials + Google. `src/lib/auth.ts`. |
| Cache / queue | **Upstash Redis** | Event cache + payment booking queue. Degrades gracefully when unset. |
| Payments | **Khalti** (ePayment API) | `src/lib/khalti.ts`, `/api/khalti/*`. |
| Validation | **Zod 4** | `src/lib/validations.ts`, `src/types/event.ts`. |
| Styling | **Tailwind CSS v4** + shadcn/ui | Design tokens in `src/app/globals.css`. |
| Email | **Resend** (optional) | `src/lib/email.ts`, gated by `ENABLE_EMAIL`. |
| QR | `qrcode` + `html5-qrcode` (scanner) | `src/lib/qr.ts`. |
| PDF | `jspdf` (client-side ticket download) | |
| 3D / motion | three.js, @react-three/*, gsap | Marketing visuals only. |
| Tests | Vitest + Testing Library | `npm test`. |

---

## 3. ⚠️ Next.js 16 is not the Next.js you know

`AGENTS.md` says it and it's real. Notable divergences from older Next:

- **Middleware lives in `src/proxy.ts`** exporting `proxy()` + `config`, not `middleware.ts`.
- Request APIs are async: `params` is a `Promise` (`const { id } = await params`), likewise `searchParams`, `cookies()`, `headers()`.
- Turbopack builds. Route groups (`(name)`) and `not-found.tsx` behave per current docs.
- **Before writing framework code, read the relevant guide in `node_modules/next/dist/docs/`.** Do not assume APIs from training data.

---

## 4. Repo layout & the route-group mental model

Everything hangs off `src/app`. Route groups (`(...)`) encode **audience + chrome**, and each group owns its layout (fonts, Nav/Footer, background).

```
src/app/
  layout.tsx                 Root: <html>, Providers (NextAuth). NO brand fonts here.
  globals.css                Design tokens (Lyante palette), font vars, utilities.
  not-found.tsx              redirect('/')

  (public)/                  Anonymous-friendly pages
    home, events, events/[id], register/[eventId],
    ticket/[token]           Shareable/scannable ticket view (public QR)
    verify/[token]           Staff verify view
    events/layout.tsx        Nav + Footer + fonts + brand glow
    ticket/layout.tsx        (same shell)

  (marketing)/               Agency pages: work, branding, contact, careers, ticketing
    layout.tsx               Nav + Footer

  (client)/                  Logged-in NON-STAFF pages (Participant + USER)
    auth/login, auth/register, auth/api/register
    booking/[booking-id]/checkout   Payment screen (Khalti)
    booking/result
    tickets, tickets/[eventId], tickets/[eventId]/[ticketId]  "My Tickets"
    profile                  Own account details + the only sign-out for buyers
    ↑ profile & tickets are two TABS of one account area (AccountHeader), §7
    auth/layout.tsx, tickets/layout.tsx, profile/layout.tsx

  (control-center)/(dashboard)/admin/   STAFF/ADMIN CRM
    login/                   Public admin login (OUTSIDE the guard — see §6)
    (panel)/                 Guarded dashboard: dashboard, events, artists,
                             scanner, [...notFound] (→ /admin/dashboard)
    (panel)/layout.tsx       Dashboard chrome (dashboard-scope shadcn theming)

  api/                       Route handlers (see §10, §11)
```

**Component homes:** `src/components/{marketing,events,tickets,dashboard,scanner,auth,ui,layout}`. `ui/` is shadcn primitives (used only in the admin/dashboard scope).

---

## 5. 🔑 TWO identity systems (most important concept)

There are **two distinct user tables and two distinct auth roles**. Confusing them breaks auth.

| | **User** (staff) | **Participant** (buyer) |
|--|--|--|
| Table | `User` | `Participant` |
| Created by | Seed / admin (`/admin/users`) / public sign-up | Google sign-in upsert (`auth.ts` `signIn` callback) |
| Login | Credentials (email+password, bcrypt) at `/admin/login` | Google OAuth at `/auth/login` |
| `session.user.role` | `ADMIN` \| `STAFF` \| `MANAGER` \| `USER` \| `ORGANIZER` | `PARTICIPANT` (synthesized in the `jwt` callback) |
| Purpose | Run the Control Center | Buy & hold tickets |

- `PARTICIPANT` is **not** in the DB `Role` enum — it only exists on the JWT/session for Google users. Credentials users carry their real DB `Role`.
- **`USER` is the no-capability role** and the `User.role` **default**. Public self-registration (`/auth/register` → `/auth/api/register`) creates rows without an explicit role, so anyone signing up themselves lands on `USER` and cannot reach the Control Center. Staff roles are only ever granted by an admin. ⚠️ Do not restore the old `@default(STAFF)` — that made public sign-up an escalation path into the CRM.
- **Staff accounts are soft-deleted** via `User.deletedAt` (set = deactivated, cleared = reactivated), matching `Participant` and `Artist`.
- **`ORGANIZER` is an event-scoped staff role.** It holds read capabilities plus
  `TICKET_SCAN`, but only for events listed in `EventAssignment` — an organizer
  with no assignments can reach nothing. Scope is enforced by
  `src/lib/eventAccess.ts`; the pure predicate lives in `src/lib/eventScope.ts`
  so the edge proxy and client components can use it too. Granting the role
  alone confers nothing; membership is managed on the event page (§6).
- Purchase endpoints require `session.user.role === 'PARTICIPANT'` (see `/api/khalti/initiate`).
- Admin endpoints/pages require a staff capability (see §6).

---

## 6. RBAC (single source of truth: `src/lib/rbac.ts`)

Capability → allowed roles map. **Check capabilities, never hardcode role strings** in features.

```
CAPABILITY = {
  DASHBOARD_VIEW:   [ADMIN, STAFF, MANAGER, ORGANIZER]
  EVENT_READ:       [ADMIN, STAFF, MANAGER, ORGANIZER]   // event-scoped for ORGANIZER
  ANALYTICS_READ:   [ADMIN, STAFF, MANAGER, ORGANIZER]   // event-scoped for ORGANIZER
  TICKET_SCAN:      [ADMIN, STAFF, ORGANIZER]            // event-scoped for ORGANIZER
  SALES_READ:       [ADMIN, ORGANIZER]                   // one event's OWN takings
  FINANCE_READ:     [ADMIN]                              // commission, platform totals, peer data
  ARTIST_READ:      [ADMIN, STAFF, MANAGER]
  EVENT_WRITE:      [ADMIN]
  TICKET_MANAGE:    [ADMIN]
  ARTIST_MANAGE:    [ADMIN]
  MARKETING_MANAGE: [ADMIN, MANAGER]
  USER_MANAGE:      [ADMIN]
  REFUND_MANAGE:    [ADMIN]                              // marks a payment refunded; cascades to its tickets
}
```

**Event scoping — the second dimension.** `hasCapability` answers "may this role
do X?"; `canAccessEvent` (in `src/lib/eventScope.ts`, pure) answers "…to THIS
event?". Server gates combine both:

- `requireEventApiCapability(cap, eventId)` — route handlers; 401/403, and the
  out-of-scope refusal is byte-identical to the no-capability one so a prober
  cannot enumerate event ids.
- `requireEventPageCapability(cap, eventId)` — server components; an
  out-of-scope organizer is redirected to `/admin/events`, not to `/`.
- `visibleEventIds(session)` — `null` means every event; an array confines a
  list query. An **empty** array means "nothing", never "everything".

These live in `src/lib/eventAccess.ts`, **not** `rbac.ts`, because `rbac.ts` is
bundled into `proxy.ts` (edge) and client components and must stay Prisma-free.

**Organizer team membership** is managed on `/admin/events/[id]` via
`/api/events/[eventId]/team` (all `USER_MANAGE`). Adding a member either
assigns an existing account or mints a new `ORGANIZER` login inline.

Helpers:
- `hasCapability(role, cap)` — pure boolean.
- `requireApiCapability(cap)` — in route handlers; returns `NextResponse` (401/403) or `{ session }`. Pattern: `const gate = await requireApiCapability('EVENT_WRITE'); if (gate instanceof NextResponse) return gate`.
- `requirePageCapability(cap)` — in server components; **redirects** (`/admin/login` if unauthenticated, `/` if under-privileged) or returns the session.
- `requireSession()` — any logged-in user (used by buyer `/api/tickets/mine`).

**The `/admin` guard** is `src/proxy.ts` (matcher `['/admin/:path*']`): it lets `/admin/login` through, else requires `DASHBOARD_VIEW` or redirects to `/admin/login`. For `ORGANIZER` it additionally blocks whole areas (`/admin/users`, `/admin/artists`, event create/edit, ticket generation) and any `/admin/events/<id>` outside the event ids carried in the JWT — coarse and possibly seconds stale, exactly like role revocation below; the page/route gate re-reads the database and is the authority. This is why admin login sits at `admin/login` **outside** `admin/(panel)/` — putting it inside the panel would infinite-loop the guard. **Do not move it in.**

**Live role re-check.** The `jwt` callback in `auth.ts` re-reads the staff row on every token refresh and collapses `role` to `USER` when the account is missing or `deletedAt` is set, so a demotion or deactivation applies within seconds instead of waiting out the JWT. Buyers (`PARTICIPANT`) skip the lookup. Note the asymmetry: `proxy.ts` uses `getToken`, which only **decodes** the cookie and does *not* run callbacks — so a revoked user still clears the proxy and is stopped one layer later by `requirePageCapability` in `admin/(panel)/layout.tsx`. Enforcement is at the page/route gate, not the edge.

**`USER_MANAGE`** is consumed by `/api/users`, `/api/users/[userId]` and the `/admin/users` pages. The `(panel)` layout only guarantees `DASHBOARD_VIEW`, so those pages call `requirePageCapability('USER_MANAGE')` themselves — hiding the nav link is cosmetic. Staff-account rules (no self-demotion, no removing the last active admin) live in `src/lib/users.ts` as pure functions; the API route calls them rather than inlining the logic.

---

## 7. Auth flows

- `src/lib/auth.ts` — `authOptions`: Credentials + Google providers, JWT strategy, `pages.signIn = '/admin/login'`. The `signIn` callback **upserts a Participant** for Google users; `jwt` sets `token.role`; `session` copies `id`/`role` onto `session.user`.
- Client: `useSession()` (wrapped by `Providers` in root layout). Server: `getServerSession(authOptions)`.
- Buyer gating pattern: unauthenticated → `/auth/login?callbackUrl=<encoded>`; after login, redirect back. Checkout self-gates.
- The Nav CTA is a single entry: signed out → "Login" (`/auth/login`), signed in → "Account" (`/profile`). It keys off *whether* a session exists, not on `PARTICIPANT` alone — the older check showed "Login" to people who were already signed in.
- **The account area is `/profile` + `/tickets` presented as two tabs**, via `AccountHeader` (`src/components/tickets/AccountHeader.tsx`) rendered at the top of both. The routes stay separate — including the drill-downs at `/tickets/[eventId]/…`, which keep the "My Tickets" tab lit through a `startsWith` check — so existing links and bookmarks are unaffected. Add a tab by editing `TABS` in that one component.
- **Mobile clients authenticate with a bearer token, not the cookie.** The Expo
  app (separate repo, `lyante-mobile`) signs in with Google natively and posts the
  ID token to **`POST /api/auth/mobile`**, which verifies it against Google's JWKS
  (`src/lib/mobileAuth.ts`), upserts the **same `Participant` row** the web
  `signIn` callback would, and returns an app JWT signed with `NEXTAUTH_SECRET`.
  Routes opt in by passing their `Request` to `requireSession(request)`; called
  with no argument only the cookie is considered. ⚠️ **`requireApiCapability`
  never consults bearer tokens**, and `sessionFromBearer` hard-codes
  `PARTICIPANT` — so a leaked app token cannot reach the Control Center. Keep it
  that way. Requires `GOOGLE_MOBILE_CLIENT_IDS` (the iOS/Android OAuth client
  IDs) or sign-in returns 503.
- **`mobileAuth.ts` must never import `next/headers`.** `rbac.ts` is pulled into
  middleware (`proxy.ts`) and client bundles (`hasCapability`), where that API
  does not exist — importing it fails the Turbopack build outright. That is why
  `sessionFromBearer` takes a `Request`.
- **Khalti knows which client started a purchase.** `initiate` accepts
  `client: 'mobile'` and stores it with the pending booking in Redis; the callback
  peeks it (without consuming the record, so failure paths work too) and redirects
  to `lyante://booking?jobId=…` instead of `/booking/result`. It is stored in Redis
  rather than smuggled through Khalti's `return_url` query, which is not
  guaranteed to preserve extra params.
- **`/profile`** (`GET /api/profile`) is the only sign-out route for non-staff; staff sign out from the Control Center sidebar. The endpoint resolves the caller against whichever identity table their role implies (§5) and is scoped to their own id.

**Required env for auth in prod:** `NEXTAUTH_SECRET`, `NEXTAUTH_URL=https://lyante.art`, `GOOGLE_CLIENT_ID/SECRET`, Google redirect URI `https://lyante.art/api/auth/callback/google`.

---

## 8. Data model (Prisma — `prisma/schema.prisma`)

Models: `User`, `Participant`, `Event`, `Artist`, `Music`, `Payment`, `Booking`, `Ticket`, `CheckIn`.

Key relationships & fields:
- **User** — staff/CRM identity. `role` defaults to `USER`; `deletedAt` marks a deactivated account. Its only relation is `EventAssignment` (cascading), and deactivation is a soft delete, so deactivating still has no FK fallout.
- **TicketActivity** — append-only record of who did what to a ticket. `ticketId`, `paymentId` and `actorId` are **not** foreign keys (the log outlives its subjects; the actor is snapshotted as text in `actorLabel`); only `eventId` is, cascading. See §12b.
- **EventAssignment** — grants one staff account access to one event (`@@unique([userId, eventId])`). Cascades on both sides; the **event-side cascade is required** because events are hard-deleted by `DELETE /api/events/[eventId]`.
- **Event** — `bookingDeadline` (⚠️ this is *the event date* everywhere in the UI; code often maps `date: event.bookingDeadline`), `capacity`, `ticketsAvailable` (offered ≤ capacity), `isOpen`, `status`, `eventType`, pricing (`baseTicketPrice`, `hasDiscount`, `discountPercentage`, `discountUpto`), `artistId?`.
- **Artist** → has many `Music` and `Event`. Soft-deleted via `deletedAt`.
- **Payment** → **Booking** (1..*) → **Ticket** (1..*). A booking groups the tickets from one purchase.
- **Ticket** — `token` (unique, used in QR/verify URLs), `attendeeName/Email`, `category`, `status`, `source`, optional `CheckIn`.
- **CheckIn** — one per ticket, set when scanned.

Enums:
- `TicketAction`: ISSUED, PURCHASED, SELF_REGISTERED, SCANNED, CANCELLED, REFUNDED, DELETED
- `ActorType`: USER, PARTICIPANT, SYSTEM
- `Role`: ADMIN, STAFF, MANAGER, **USER** (no capabilities; the `User.role` default — see §5), **ORGANIZER** (event-scoped — see §6)
- `EventStatus`: DRAFT, PUBLISHED, CANCELLED, **COMPLETED**
- `EventType`: CONCERT, FESTIVAL, CONFERENCE, SPORTS, PRIVATE, OTHER
- `PaymentStatus` / `bookingStatus`: PAID, REFUND, PENDING, REJECTED
- `TicketCategory`: GENERAL, VIP
- `TicketStatus`: UNUSED, USED, CANCELLED
- `TicketSource`: ADMIN, SELF_REGISTERED

**When you add/change an enum or column you MUST add a Prisma migration** (see §14).

---

## 9. Event lifecycle & availability (single source of truth: `src/lib/events.ts`)

**Never re-derive availability or sale rules ad hoc.** `computeEventAvailability(input, now?)` is the one place that decides `remaining`, `soldOut`, `ended`, `lifecycle`, `isPurchasable`, and `badges`. Both admin and public UIs call it so rules can't drift. `purchaseBlockedReason(availability)` gives the human message.

`EventStatus` semantics:
- **DRAFT** — hidden from public.
- **PUBLISHED** — on sale (subject to `isOpen`, deadline, inventory).
- **CANCELLED** — hidden, not purchasable.
- **COMPLETED** — event concluded. Public `/events` shows it in a "COMPLETED EVENTS" section; buyer tickets are **retired** (see §12).

**COMPLETED rule (enforced FE + BE):** an event may only become COMPLETED when its date (`bookingDeadline`) is **today or in the past** — never future. The shared guard is `isCompletableDate(date, now?)` in `events.ts`, used by:
- FE: `EventForm`, `EditEventForm` (submit guard), `EventManageActions` (button disabled for future dates).
- BE: `createEventSchema` refine + the `PATCH /api/events/[eventId]` route (loads stored `bookingDeadline` when the body omits a date, returns 422 on violation).

`isPubliclyVisible()` = PUBLISHED and not past. The public `/events` page splits PUBLISHED into **upcoming** / **past**, plus a separate **completed** list from `status === 'COMPLETED'`.

---

## 10. Payment → ticket pipeline (Khalti + Upstash queue)

Purchase is **server-authoritative** and asynchronous. Flow:

1. **`POST /api/khalti/initiate`** (requires `PARTICIPANT`): re-checks availability/inventory server-side (client cannot bypass), computes discounted amount, calls Khalti ePayment `initiate`, and **stores the pending booking in Redis keyed by `pidx`** (30-min TTL) via `storePendingBooking`. Returns `payment_url`; client redirects to Khalti.
2. User pays on Khalti → Khalti redirects to **`/api/khalti/callback`**.
3. Callback verifies `status === 'Completed'` (looks it up if needed), pops the pending booking, **enqueues** the job (`enqueueBooking`) and drains the per-event queue (`processBookingQueue`) under a Redis lock. This serializes concurrent purchases per event to protect inventory.
4. `createBookingPipeline` (in `src/lib/ticketing.ts`) creates `Payment → Booking → Ticket[]` in one `prisma.$transaction`, then best-effort emails tickets (`Promise.allSettled`, never blocks). Redirects to `/booking/result`.

Ticketing helpers live in **`src/lib/ticketing.ts`** (queue keys: `booking:<pidx>`, `booking:job:<id>`, `booking:queue:<eventId>`, `booking:result:<id>`, `booking:lock:<eventId>`). `/api/stress/*` exercises this path.

**Khalti config:** `KHALTI_SECRET_KEY` + `KHALTI_BASE_URL` (`https://dev.khalti.com` or `https://a.khalti.com` sandbox vs `https://khalti.com` live). *"Invalid token"* almost always means the key/endpoint types don't match. If Upstash is unset, initiate returns **503** by design.

---

## 11. Caching (`src/lib/upstash/`)

- `services/event-cache.ts` — `getCachedEvents()`, `getCachedEvent(id)`, `getCachedUpcomingEvents()`, `invalidateEventCache(id?)`. Short **`TTL = 60`s**; **`KEY_VERSION`** namespaces keys — **bump it to instantly orphan all cached data** after a DB reset/switch (currently `v3`).
- `upstash.ts` exposes `redisConfig` and **`isRedisConfigured`**. Everything degrades gracefully when Upstash env is absent — never assume Redis exists; guard with `isRedisConfigured`.
- **Admin pages read the DB directly** (not the cache) so staff always see true state; **public pages read the cache**. Mutations call `invalidateEventCache`.

---

## 12. Buyer ticket retirement on COMPLETED

When an event is COMPLETED, the buyer's tickets are disabled across the **My Tickets** tab. The `/api/tickets/mine*` responses include `event.status`; the pages then:
- `/tickets` & `/tickets/[eventId]` — gray out, show an **"Event completed!"** flag, desaturate the QR.
- `/tickets/[eventId]/[ticketId]` — disable **Download / Share / View Public Ticket** (buttons disabled *and* the handlers early-return), gray the card, banner. Download/share are client-side (jsPDF / Web Share), so the UI-disable + handler-guard is the full enforcement.

---

## 12b. Ticket activity log

Every security-critical ticket action is recorded in `TicketActivity` through the
single funnel `recordTicketActivity(tx, entry)` in `src/lib/ticketActivity.ts`.

**The helper takes a transaction client, not the Prisma singleton.** The log
entry and the state change it describes must commit or roll back together — a
check-in that succeeds without an attributable log entry is exactly the failure
this exists to prevent. The only call site passing the singleton is
`/api/stress/cleanup`, whose deletes are not in a transaction either.

Actor identity is **snapshotted as text** (`actorLabel`, e.g.
`"Sita Thapa <sita@lyante.art>"`), never resolved by join, so the record still
names who acted after the account is renamed, deactivated or removed. Before
this, `CheckIn` stored only `scannedAt` — a wrongful check-in was untraceable.

Granularity: per-ticket rows for state changes (SCANNED, CANCELLED); one
aggregate row carrying `quantity` for multi-ticket creation (bulk, distributor,
checkout), since each of those is one action by one person.

**Cancel and refund did not exist before this log.** Nothing wrote
`TicketStatus.CANCELLED` or `PaymentStatus.REFUND`, so both analytics figures
were structurally zero. Now:

- `PATCH /api/events/[eventId]/tickets/[ticketId]` — `TICKET_MANAGE`, reason
  required. Cancelling an already-scanned ticket is allowed and recorded as an
  override (`meta.wasUsed`).
- `POST /api/events/[eventId]/tickets/[ticketId]/refund` — `REFUND_MANAGE`. Marks
  the payment `REFUND` **and cancels every ticket it paid for**, atomically —
  refunding without cancelling would leave a refunded buyer able to walk in.
  Already-scanned tickets are counted and reported, never reverted. Zero-value
  comped payments (from `ensureSystemBooking`) are refused.

Both hang off the ticket row because the Control Center has no payments UI. Read
at `/admin/events/[id]/activity`, gated `EVENT_READ`, so organizers see their own
event's log. Recording a refund does **not** move money — that happens out of
band through Khalti's own dashboard.

## 13. Design system (Lyante brand)

Tokens are CSS variables in `src/app/globals.css`, exposed as Tailwind colors:

| Token | Hex | | Token | Hex |
|--|--|--|--|--|
| `gold-light` | #f5c842 | | `lyante-bg` | #080808 |
| `gold` | #c8922a | | `lyante-surface` | #111111 |
| `gold-deep` | #8b5e10 | | `lyante-surface-mid` | #1c1c1c |
| `ivory` | #f0ede6 | | `ash` | #9a9590 |
| | | | `coal` | #4a4744 |

Fonts (CSS vars): `font-bebas` (display headings, uppercase), `font-cormorant` (serif accent), `font-dm-sans` (body). Utility class `.section-label` for the small gold eyebrows.

**Conventions to match when building UI:**
- Dark, gold-on-black editorial look. Headings in `font-bebas` uppercase; a gold `.section-label` eyebrow; a gradient hairline divider (`bg-gradient-to-r from-gold/60 via-coal/40 to-transparent`).
- **Use the token classes, not raw hex.** (The `/tickets` pages were migrated off inline hex — don't reintroduce it.)
- **Brand fonts are only available where a layout declares the font CSS vars.** The root layout does **not**. If you add a page in a group without those vars, add them via that group's layout (mirror `(public)/events/layout.tsx` or `(client)/auth/layout.tsx`). Otherwise `font-bebas` silently won't render.
- The admin/dashboard uses shadcn primitives under a `dashboard-scope` class (retinted to gold) — that's a separate, lighter visual world from the public dark brand.

---

## 14. Migrations & DB gotchas

- Build runs **`prisma generate && prisma migrate deploy && next build`**, so Vercel applies migrations and regenerates the client on deploy. `postinstall` also runs `prisma generate`.
- Adding an enum value = a real migration (e.g. `ALTER TYPE "EventStatus" ADD VALUE 'COMPLETED';`). **Postgres forbids *using* a new enum value in the same transaction that adds it**, so if the same change also needs that value (as a `DEFAULT`, in an `UPDATE`, …), split it across two migration folders — see `20260804120000_add_user_role_enum_value` followed by `20260804120100_user_soft_delete_default_role`. **A regenerated client + applied DB migration are two separate things** — a running `next dev` keeps the OLD generated client in memory until restarted, which surfaces as `PrismaClientValidationError: Expected <Enum>` even when the DB is fine. Restart the dev server after schema changes.
- Migrations here were authored against empty DBs; some fail on populated data (e.g. NOT NULL backfills). Prisma **blocks `migrate reset` for AI agents** — don't fight it. Config is `prisma.config.ts` (loads env, configures `db seed` via `tsx prisma/seed.ts`).
- Seed: `npm run db:seed`. Admin credentials come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env (fallback to defaults in `prisma/seed.ts`).

---

## 15. 🚫 Do-not-break landmines

1. **Client components must fetch RELATIVE URLs** (`fetch('/api/...')`), never `${NEXT_PUBLIC_APP_URL}/api/...` — absolute URLs cause CORS in prod. (Multiple past bugs.)
2. **Server components must NOT self-fetch their own API over HTTP** — read the data layer directly (`getCachedEvents()`, `prisma.*`). Self-fetching breaks on cold starts / when `NEXT_PUBLIC_APP_URL` is wrong.
3. **Don't move `admin/login` inside `admin/(panel)/`** — the proxy guard would loop (§6).
4. **Don't gate `(marketing)` / `(public)` layouts behind a capability** — a past merge accidentally added `requirePageCapability('MARKETING_MANAGE')` to the public site and redirected everyone to login. Public means public.
5. **Availability/sale logic goes through `events.ts`** — don't inline `soldOut`/`ended`/`isPurchasable` checks in components or routes.
6. **Purchase amounts & inventory are validated server-side** in `/api/khalti/initiate` — never trust client-sent price/quantity.
7. **Guard Upstash usage** with `isRedisConfigured`; the app must still run without it (payments return 503, cache falls back to DB).
8. **Enum/status changes ripple**: DB migration → Prisma schema → `eventStatusSchema` (validations) → `src/types/event.ts` → any `EventStoredStatus`/UI union → the pages that filter on status. Update all of them.
9. **`bookingDeadline` IS the event date.** Don't add a separate `date` column expecting persistence — the UI maps `date` from `bookingDeadline`.
10. Keep the group **layout font declarations** when adding pages, or brand fonts break (§13).
11. **`User.role` must stay `@default(USER)`.** Public sign-up creates `User` rows without a role; defaulting to `STAFF` (as it once did) hands every self-registered stranger a Control Center account with ticket-scanning rights.
12. **Never return `User.password`.** API routes use an explicit `select` and go through `toStaffUserDto` in `src/lib/users.ts` rather than returning rows wholesale.
13. **`src/lib/rbac.ts` and `src/lib/eventScope.ts` must never import Prisma or `next/headers`.** Both are bundled into `src/proxy.ts` (edge) and into client components. DB-backed scoping belongs in `src/lib/eventAccess.ts`.
14. **`getEventPeerComparison` returns other events by name with their net revenue.** It is `FINANCE_READ`-only and must not even be *fetched* for anyone else — including for the analytics PDF input — or an organizer sees every other event's takings.
15. **Scope-check before mutating in `verifyTicket`.** A wrong-event scan must return `WRONG_EVENT` without consuming the attendee's ticket, and the check sits ahead of the cancelled/already-used branches so it leaks no ticket state either.
16. **An empty `visibleEventIds` array means "no events", not "all events".** Guard with `scope ? { id: { in: scope } } : undefined` — never with `scope?.length`.
17. **`recordTicketActivity` must be passed the same `tx` as the state change it records.** Logging against the Prisma singleton beside a transaction lets the two diverge, which defeats the log.
18. **The activity log has no update or delete path, and must not gain one.** It is append-only by construction, not by permission.
19. **Ticket-creation routes now run inside INTERACTIVE transactions** (the log entry shares them). Prisma defaults those to a 5s timeout; bulk (200 tickets) and distributor (500) therefore set an explicit one. Converting a batch `$transaction([...])` to the interactive form without a timeout will abort large runs that used to succeed.

---

## 16. Environment variables

Auth: `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_MOBILE_CLIENT_IDS` (comma-separated iOS/Android OAuth client IDs — required for mobile sign-in).
App: `NEXT_PUBLIC_APP_URL` (e.g. `https://lyante.art`), `NODE_ENV`, `VERCEL_URL`.
DB: `DATABASE_URL` (Neon; pooled).
Payments: `KHALTI_SECRET_KEY`, `KHALTI_BASE_URL`.
Cache/queue: `UPSTASH_URL`, `UPSTASH_TOKEN`.
Email (optional): `ENABLE_EMAIL`, `RESEND_API_KEY`, `EMAIL_FROM`.
Seed: `ADMIN_EMAIL`, `ADMIN_PASSWORD`. Stress: `STRESS_TEST_KEY`.

---

## 17. Commands

```bash
npm run dev            # next dev (Turbopack). Restart after Prisma schema changes.
npm run build          # prisma generate && prisma migrate deploy && next build
npm test               # vitest
npm run db:seed        # seed admin + reference data
npx prisma generate    # regenerate client after schema edits
npx prisma migrate deploy   # apply pending migrations to the DB
npx prisma migrate status   # verify DB is in sync
```

Amit satellite site: `dev:amit`, `build:amit`, `typecheck:amit` (pnpm workspace filter).

---

## 18. Workflow expectations

- Work happens on branches / worktrees; changes are committed and **pushed to `main`** (Vercel auto-deploys). Verify with `npm run build` before committing.
- Commits co-authored per repo convention. Keep this file current when architecture shifts.
