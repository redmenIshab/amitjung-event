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
| MARKETING_MANAGE | Control-center marketing / CMS section | ✓ | — | ✓ |
| USER_MANAGE | User / role administration (reserved) | ✓ | — | — |

Enforcement:
- API routes: `requireApiCapability(cap)` (401 unauth, 403 under-privileged).
- Server components: `requirePageCapability(cap)` (redirect `/login` / `/`).
- Participant routes: `requireSession()` (authenticated, any role; row ownership
  enforced in-query).
- Edge backstop: `src/proxy.ts` gates `/admin/:path*` on `DASHBOARD_VIEW`.
