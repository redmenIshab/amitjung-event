# Amit Jung — `sites/amit` (amit.lyante.art)

Satellite artist site for Amit Jung: immersive artist page + booking calendar
for event organizers. Deployed as its **own Vercel project** from this
monorepo. Next.js 16 + TypeScript. All content lives in `data/site.ts`.

## Local development

Run from the **repo root** (not this folder):

```bash
pnpm install
pnpm --filter amit-jung-site dev        # http://localhost:3000
pnpm --filter amit-jung-site build
pnpm --filter amit-jung-site typecheck
```

Both apps default to port 3000, so to run this one alongside the Lyante app,
give it its own port (note: no `--` before the flag — pnpm forwards it as-is):

```bash
pnpm --filter amit-jung-site dev -p 3100   # http://localhost:3100
```

## Editing content

Everything is in `data/site.ts`, typed by the `Site` interface:

- **`bookingEmail` / `whatsapp`** — where booking requests are routed.
- **`bookedDates`** — array of `YYYY-MM-DD` strings. Add a date to block it on
  the calendar; remove it to reopen. Redeploy (push) after editing.
- **`slots`** — the performance-slot options in the inquiry form.
- **`videos` / `tracks` / `works` / `stats` / `socials`** — content sections.
- **`lyanteUrl` / `lyanteEventsUrl`** — cross-links back to the Lyante site.

## How booking works

1. Organizer picks an open date (booked dates struck out, past dates disabled,
   6 months browseable).
2. The inquiry form's "Request this date" opens their email client pre-filled
   to `bookingEmail`; a WhatsApp deep link is offered as an alternative.
3. Lyante replies with terms + a formal agreement. The site states clearly that
   a booking is confirmed only after written agreement and deposit.

No backend or database — availability is managed by editing `bookedDates`.

## Deploy (Vercel — one-time setup)

This repo hosts **two independent Vercel projects**:

| Project | Root Directory  | Domain            |
|---------|-----------------|-------------------|
| lyante  | `.` (repo root) | `lyante.art`      |
| amit    | `sites/amit`    | `amit.lyante.art` |

Each builds only its own app, so a change to one does not rebuild the other.

To stand up the amit project:

1. In Vercel: **Add New → Project**, import this same Git repository.
2. Set **Root Directory** to `sites/amit`. Framework preset: Next.js.
   (Vercel detects the pnpm workspace and installs from the repo root.)
3. Deploy, then go to **Settings → Domains → Add** and add `amit.lyante.art`.
4. At the DNS provider for `lyante.art`, add the record Vercel shows —
   typically a `CNAME` for `amit` → `cname.vercel-dns.com`.
5. The existing `lyante.art` project needs no changes.

## Cross-links between the two sites

- **amit.lyante.art → lyante.art**: "Lyante" nav link, the footer
  "Represented by Lyante Production" credit, and a CTA under the booking
  section pointing at `lyante.art/ticketing`.
- **lyante.art → amit.lyante.art**: the "ARTISTS" column in the marketing
  footer (`src/components/marketing/layout/Footer.tsx`).

## Notes

- This app keeps its own plain `app/globals.css` and Google-Fonts `<link>`. It
  does **not** share Tailwind, design tokens, or components with the Lyante app
  — they never share a bundle, so there is no styling collision.
- The root `tsconfig.json` excludes `sites/`, so the Lyante typecheck does not
  reach into this app. This app has its own `tsconfig.json`.
