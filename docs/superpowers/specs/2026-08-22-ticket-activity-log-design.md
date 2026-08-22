# Ticket Activity Log — Design

**Date:** 2026-08-22
**Status:** Approved, pending implementation
**Branch:** `feat/ticket-activity-log` off `main`

## Goal

Record who did what to a ticket. Every security-critical ticket action — scan,
cancel, refund — becomes an attributable, append-only log entry, readable per
event by the people responsible for that event.

## Context: two of the three actions do not exist

Mapping every write to ticket and payment state on `main` turned up a gap that
shapes the whole design:

- **Scan** exists (`verifyTicket`), but `CheckIn` records only `scannedAt` —
  **not who scanned**. Today a wrongful check-in is untraceable.
- **Cancel does not exist.** Nothing in the codebase writes
  `TicketStatus.CANCELLED`. The enum value is read by analytics, rejected by
  `verifyTicket`, and rendered by `TicketTable`, but no endpoint or UI ever
  sets it. Every "cancelled" count is structurally zero.
- **Refund does not exist.** Nothing writes `PaymentStatus.REFUND`.
  `analytics.ts` computes `netCollected = gross − refunds` against a column
  nothing populates, so the reported refund rate is always 0%.

Ticket writes that do exist: `createBookingPipeline` (checkout), admin issue,
bulk issue, distributor issue, self-registration, scan, and `stress/cleanup`
deletion.

A log alone would therefore be permanently silent on two of the three actions
named in the request. **Approved scope: the log, plus a cancel action and a
mark-as-refunded action.** "Refund" here means recording that a refund
happened; money moves out of band through Khalti's own dashboard.

## Approved decisions

| Question | Decision |
|---|---|
| Scope | Log + cancel + mark-refunded. No Khalti refund API call. |
| Granularity | Per-ticket rows for state changes; one aggregate row for multi-ticket creation |
| Placement | `/admin/events/[id]/activity` + event-page strip + per-ticket history; organizers read their own event |
| Refund → tickets | Auto-cancel the payment's tickets in the same transaction |

## 1. Data model

```prisma
model TicketActivity {
  id      String       @id @default(cuid())
  eventId String
  event   Event        @relation(fields: [eventId], references: [id], onDelete: Cascade)
  action  TicketAction

  /// The exact ticket, for state changes. Null on aggregate creation rows.
  ticketId  String?
  /// The payment, for refunds.
  paymentId String?
  /// Tickets covered by this entry. >1 only on aggregate creation rows.
  quantity  Int    @default(1)

  actorType  ActorType
  actorId    String?
  /// Snapshot: "Sita Thapa <sita@lyante.art>". Never resolved by join.
  actorLabel String
  actorRole  String?

  /// Required on CANCELLED and REFUNDED.
  reason String?
  /// Refund amount, same unit as Payment.finalAmount.
  amount Int?
  /// Structured extras, e.g. { alreadyUsed: 1 } from a refund cascade.
  meta   Json?

  createdAt DateTime @default(now())

  @@index([eventId, createdAt])
  @@index([ticketId])
}

enum TicketAction {
  ISSUED
  PURCHASED
  SELF_REGISTERED
  SCANNED
  CANCELLED
  REFUNDED
  DELETED
}

enum ActorType {
  USER
  PARTICIPANT
  SYSTEM
}
```

**`ticketId`, `paymentId` and `actorId` are deliberately not foreign keys.** A
log that cascades away with its subject, or that renders "who" through a join to
a row someone later renamed, is not an audit log. Identity is snapshotted as
text at write time.

**`eventId` is a cascading FK.** Events are hard-deleted and take their tickets
with them (`Ticket.event` already cascades); per-event log rows surviving with
no event and no viewer would be worse than losing them.

Two migrations, per ARCHITECTURE §14 — the enums are added separately from the
table that uses them.

## 2. One write funnel

`src/lib/ticketActivity.ts`:

- `recordTicketActivity(tx, entry)` — takes a **transaction client**, so the log
  entry and the state change commit or roll back together. A scan that succeeds
  without a log entry is precisely the failure this feature exists to prevent.
- `actorFromSession(session)` → `{ actorType, actorId, actorLabel, actorRole }`,
  resolving staff (`USER`) and buyers (`PARTICIPANT`).
- `SYSTEM_ACTOR` — the queue worker and other unattended paths, so
  pipeline-created tickets are not attributed to a person.

The module is server-only and may import Prisma types, but takes the client as a
parameter rather than importing the singleton, so it is trivially testable.

## 3. Write points

| Flow | File | Action | Rows |
|---|---|---|---|
| Scan | `src/lib/verify.ts` | `SCANNED` | 1, naming ticket + actor |
| Admin issue | `api/events/[eventId]/tickets/route.ts` | `ISSUED` | 1 |
| Bulk issue | `.../tickets/bulk/route.ts` | `ISSUED` | 1, `quantity: N` |
| Distributor | `.../tickets/distributor/route.ts` | `ISSUED` | 1, `quantity: N` |
| Checkout | `src/lib/ticketing.ts` | `PURCHASED` | 1, `quantity: N`, actor = buyer |
| Self-register | `api/register/[eventId]/route.ts` | `SELF_REGISTERED` | 1 |
| Cancel (new) | `.../tickets/[ticketId]/route.ts` | `CANCELLED` | 1 |
| Refund (new) | `.../tickets/[ticketId]/refund/route.ts` | `REFUNDED` + cascade | 2 |
| Cleanup | `api/stress/cleanup/route.ts` | `DELETED` | 1, `quantity: N` |

**`verifyTicket`'s signature changes** from `(token, allowedEventIds?)` to
`(token, options?: { allowedEventIds?, actor? })`. It needs the actor, and a
third positional parameter on a two-parameter function is worse than the
options object. Its existing tests move with it.

## 4. Cancel and refund

Neither action has a home today, because **there is no payments UI anywhere** in
the Control Center. Rather than build one, both hang off the ticket row on the
event detail page — where an admin already is when a buyer complains.

**Cancel** — `PATCH /api/events/[eventId]/tickets/[ticketId]`, capability
`TICKET_MANAGE`, `reason` required (non-empty, ≤500 chars). Cancelling an
already-scanned ticket is permitted but recorded as an override
(`meta: { wasUsed: true }`) — someone physically walked in, and refusing to
record that would be worse than recording an unusual action. Cancelling an
already-cancelled ticket is a 409.

**Refund** — `POST /api/events/[eventId]/tickets/[ticketId]/refund`, new
capability `REFUND_MANAGE: ['ADMIN']`, `reason` required. It walks
ticket → booking → payment and, in one transaction:

1. sets `Payment.paymentStatus = 'REFUND'`,
2. sets every non-cancelled ticket under that payment's bookings to `CANCELLED`,
3. writes a `REFUNDED` row (with `amount`) and an aggregate `CANCELLED` row.

Tickets already `USED` are **counted and reported, never reverted** — the log
records `meta: { alreadyUsed: N }` and the response surfaces it so the admin
knows someone was admitted on a now-refunded purchase.

Refused with 409 when the payment is already `REFUND`, and when
`payment.finalAmount === 0` — that is the synthetic zero-value payment
`ensureSystemBooking` mints for comped tickets, where a refund is meaningless.
The UI hides the action in the same case.

`REFUND_MANAGE` is kept separate from `TICKET_MANAGE` because it moves money on
the books; the repo's convention is a capability per concern.

## 5. Read surfaces and access

- **`/admin/events/[id]/activity`** — the full feed, newest first, filterable by
  action, gated `requireEventPageCapability('EVENT_READ', eventId)`. Organizers
  get their own event's log and 403/redirect on any other.
- **Event detail page** — a compact "Recent activity" strip (latest 5) linking
  to the full feed, same capability.
- **Per-ticket history** — the ticket row exposes that ticket's entries.

There are **no mutation endpoints for the log**. Append-only by construction,
not by permission — nothing in the app can edit or delete an entry.

## 6. Deliberately out of scope

No backfill: the log starts empty. Scans that happened before this ships have no
recoverable actor, since `CheckIn` never stored one. No Khalti refund API call,
no partial refunds. No global cross-event feed. No retention or purge job.

## 7. Testing

- `recordTicketActivity` writes through the passed transaction client, not the
  singleton.
- A scan writes exactly one `SCANNED` row naming the scanner; a `WRONG_EVENT`
  refusal writes **none**.
- Cancel: reason required; double-cancel 409s; cancelling a `USED` ticket is
  allowed and flagged.
- Refund: cascade cancels all tickets and marks the payment atomically; a
  failure mid-way rolls back the log too; zero-value payment refused; already
  refunded refused; `alreadyUsed` counted and never reverted.
- Access: organizer reads own-event activity, 403s on another event; a role
  without `REFUND_MANAGE` cannot refund.
- Regression: existing ticket-creation flows still succeed, and analytics counts
  are unchanged for events with no cancels or refunds.

## 8. Documentation

ARCHITECTURE.md §6 (new capability), §8 (new model and enums), §12 or a new
subsection describing the log, and §15 (append-only landmine; the log write must
share the state change's transaction).
