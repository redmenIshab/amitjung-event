# Ticketing Initiative — Roadmap (P0–P3)

**Date:** 2026-07-21

The user-facing ticketing initiative is decomposed into four sub-projects, each
with its own spec → plan → build cycle. This note captures the agreed scope and
order so decisions aren't lost between cycles.

## Agreed decisions

- **Auth stack:** extend the existing **NextAuth** setup (add a Facebook
  provider alongside Google, keep the Prisma `Participant` model and JWT
  sessions). **No Supabase** — it is not in the repo and will not be introduced.
- **Build order:** P0 → P1 → P2 → P3.
- **Base branch:** `origin/dev` (holds the ticketing/RBAC WIP).

## Sub-projects

### P0 — RBAC centralization *(current)*
Single-source-of-truth `rbac.ts`, restored `/admin/*` proxy backstop, all call
sites refactored, FE control gating, role×capability matrix doc.
Spec: `2026-07-21-rbac-centralization-design.md`.

### P1 — Event data model + admin form
The admin add/edit-event form is missing fields needed to actually sell tickets.
Add (schema migration + validation + form):
- Inventory: `ticketsAvailable` / capacity-vs-sold tracking.
- Event **status**: draft / published / live / ended / cancelled.
- Sale-**state** badges: early-bird / limited / filling fast (derivable or
  explicit).
- Event **type / category**.
- Sale window (on-sale / off-sale), and price tiers if in scope.
Depends on: nothing. Foundation for P3.

### P2 — Participant auth + account portal
Signup/signin for users (Google + Facebook via NextAuth), a **user-only portal**
(`/account`) to see tickets purchased across events, and **download (PDF, via
`jspdf`) + share**. Builds on the existing `Participant` model and the
`/api/tickets/mine/*` routes already on `dev`.
Depends on: auth-stack decision (settled). Reuses P0 helpers (`requireSession`).

### P3 — Public purchase flow + Khalti integrity
`/events` list → event detail → "buy" (only if event valid & tickets available)
→ auth-gate (quick login/signup from P2) → **Khalti** payment with the amount
priced **server-side** → callback verified server-side → **idempotent ticket
issuance**. Fixes the payment-tampering and forgeable-callback findings from the
security evaluation. Strong server-side enforcement throughout.
Depends on: P1 (inventory/price/status) + P2 (participant identity).

## Security themes carried across all sub-projects

- Server-side authority for anything money- or access-related (never trust
  client-supplied price, role, or ticket ownership).
- Idempotency for payment callbacks and ticket issuance.
- Rate-limiting / abuse controls on public write endpoints (registration,
  purchase initiation).
