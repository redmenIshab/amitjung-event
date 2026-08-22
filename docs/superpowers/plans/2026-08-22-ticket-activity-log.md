# Ticket Activity Log Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. TDD throughout: failing test, then implementation.

**Goal:** Make every security-critical ticket action attributable — scan, cancel, refund — via an append-only per-event log, and build the cancel and refund actions that do not yet exist.

**Architecture:** One `TicketActivity` table with snapshotted actor identity and no FKs to its subjects. A single `recordTicketActivity(tx, entry)` funnel that takes a transaction client, so the log entry and the state change are atomic. Cancel and refund hang off the ticket row because the Control Center has no payments UI.

**Tech Stack:** Next.js 16 (middleware is `src/proxy.ts`), Prisma 6 + PostgreSQL, NextAuth v4, Zod 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-22-ticket-activity-log-design.md`

## Global Constraints

- **The log write MUST share the state change's transaction.** `recordTicketActivity` takes a `tx` client; never call it against the Prisma singleton alongside a separate transaction.
- **No FKs on `ticketId` / `paymentId` / `actorId`** — the log outlives its subjects. Only `eventId` is a FK (cascading).
- **The log has no mutation endpoints.** Append-only by construction.
- Two migration folders: enums first, then the table (ARCHITECTURE §14).
- `rbac.ts` stays Prisma-free (ARCHITECTURE §15.13).
- Money amounts are integers in the same unit as `Payment.finalAmount`.
- Run tests with `npx vitest run` (`.claude/**` is already excluded).
- Restart `next dev` after schema changes.

---

- [ ] **Task 1 — Schema + migrations.** `TicketActivity`, `TicketAction`, `ActorType`; `Event.activities` back-relation. Migration `..._add_ticket_activity_enums` then `..._create_ticket_activity`. Verify `prisma validate` + `generate`.

- [ ] **Task 2 — `src/lib/ticketActivity.ts` + `tests/lib/ticketActivity.test.ts`.** `recordTicketActivity(tx, entry)`, `actorFromSession(session)`, `SYSTEM_ACTOR`. Tests: writes through the passed client not the singleton; staff/buyer/system actor labels; label survives without a join.

- [ ] **Task 3 — `REFUND_MANAGE: ['ADMIN']`** in `CAPABILITY` + rbac test rows asserting every other role is denied.

- [ ] **Task 4 — Scan logging.** `verifyTicket(token, options?)` with `{ allowedEventIds, actor }`; write one `SCANNED` row inside the existing transaction. `WRONG_EVENT`, `CANCELLED`, `ALREADY_USED` and `NOT_FOUND` write nothing. Update `/api/verify/[token]` to pass the actor. Update existing verify tests to the new signature.

- [ ] **Task 5 — Creation-path logging.** `ISSUED` (single, bulk, distributor), `PURCHASED` (`createBookingPipeline`, actor = buyer), `SELF_REGISTERED` (register route), `DELETED` (stress cleanup). Aggregate rows carry `quantity`.

- [ ] **Task 6 — Cancel.** `PATCH /api/events/[eventId]/tickets/[ticketId]`, `TICKET_MANAGE`, `cancelTicketSchema` (reason 1..500). 409 on already-cancelled; `meta.wasUsed` when overriding a scanned ticket. Tests.

- [ ] **Task 7 — Refund.** `POST /api/events/[eventId]/tickets/[ticketId]/refund`, `REFUND_MANAGE`. One transaction: payment → `REFUND`, all non-cancelled tickets under it → `CANCELLED`, `REFUNDED` row + aggregate `CANCELLED` row. 409 on already-refunded and on `finalAmount === 0`. `alreadyUsed` counted, never reverted. Tests including rollback.

- [ ] **Task 8 — Read surfaces.** `/admin/events/[id]/activity` page + `ActivityFeed` component with action filter; recent-activity strip on the event page. Both `requireEventPageCapability('EVENT_READ', eventId)`.

- [ ] **Task 9 — Ticket row actions.** Cancel and Refund controls in `TicketTable`, reason prompt, refund hidden when the payment is zero-value. Per-ticket history.

- [ ] **Task 10 — End-to-end integration suite.** Route-level, real handlers: cancel/refund authorization per role, organizer scoping on the activity read, the refund cascade end to end, and a regression block proving existing creation flows still work.

- [ ] **Task 11 — Docs.** ARCHITECTURE.md §6 (capability), §8 (model + enums), new activity-log subsection, §15 landmines (append-only; shared transaction).

## Self-Review

**Spec coverage:** §1 → Task 1. §2 → Task 2. §3 → Tasks 4, 5. §4 → Tasks 3, 6, 7. §5 → Tasks 8, 9. §6 is exclusions. §7 → Tasks 2–7, 10. §8 → Task 11.

**Ordering:** Task 4 changes `verifyTicket`'s signature, so it must land before anything else touches that call site. Task 3 precedes Task 7, which uses the capability.
