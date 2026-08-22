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
import { requireEventApiCapability, visibleEventIds } from '@/lib/eventAccess'

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

    it('cannot manage its own team', async () =>
      expect(allowed(await requireApiCapability('USER_MANAGE'))).toBe(false))
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
      'USER_MANAGE',
      'ARTIST_MANAGE',
      'ARTIST_READ',
      'EVENT_WRITE',
      'TICKET_MANAGE',
      'MARKETING_MANAGE',
      'FINANCE_READ',
    ] as const) {
      it(`is denied ${cap}`, async () =>
        expect(allowed(await requireApiCapability(cap))).toBe(false))
    }
  })

  describe('an organizer with no assignments', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role: 'ORGANIZER' } })
      assignmentFindMany.mockResolvedValue([])
    })

    it('reaches no event at all', async () => {
      expect(allowed(await requireEventApiCapability('EVENT_READ', ASSIGNED))).toBe(false)
      expect(allowed(await requireEventApiCapability('EVENT_READ', OTHER))).toBe(false)
    })

    it('resolves to an empty scope, never to "all"', async () => {
      const scope = await visibleEventIds({ user: { id: 'u1', role: 'ORGANIZER' } } as never)
      expect(scope).toEqual([])
      expect(scope).not.toBeNull()
    })
  })

  describe('unauthenticated', () => {
    it('401s on a scoped route', async () => {
      mockGetServerSession.mockResolvedValue(null)
      const r = await requireEventApiCapability('EVENT_READ', ASSIGNED)
      expect((r as NextResponse).status).toBe(401)
    })

    it('401s on an unscoped route', async () => {
      mockGetServerSession.mockResolvedValue(null)
      const r = await requireApiCapability('DASHBOARD_VIEW')
      expect((r as NextResponse).status).toBe(401)
    })
  })

  describe('regression — existing roles keep their reach', () => {
    it('ADMIN reaches every event and capability', async () => {
      signIn('ADMIN')
      expect(allowed(await requireEventApiCapability('EVENT_READ', OTHER))).toBe(true)
      expect(allowed(await requireEventApiCapability('EVENT_WRITE', OTHER))).toBe(true)
      expect(allowed(await requireApiCapability('FINANCE_READ'))).toBe(true)
      expect(allowed(await requireApiCapability('SALES_READ'))).toBe(true)
      expect(allowed(await requireApiCapability('USER_MANAGE'))).toBe(true)
      expect(allowed(await requireApiCapability('ARTIST_READ'))).toBe(true)
      expect(await visibleEventIds({ user: { id: 'u1', role: 'ADMIN' } } as never)).toBeNull()
    })

    it('STAFF still reads any event and scans any ticket', async () => {
      signIn('STAFF')
      expect(allowed(await requireEventApiCapability('EVENT_READ', OTHER))).toBe(true)
      expect(allowed(await requireEventApiCapability('TICKET_SCAN', OTHER))).toBe(true)
      expect(allowed(await requireApiCapability('ARTIST_READ'))).toBe(true)
      expect(allowed(await requireApiCapability('EVENT_WRITE'))).toBe(false)
      expect(allowed(await requireApiCapability('SALES_READ'))).toBe(false)
      expect(allowed(await requireApiCapability('FINANCE_READ'))).toBe(false)
    })

    it('MANAGER keeps analytics and marketing, still no scanning', async () => {
      signIn('MANAGER')
      expect(allowed(await requireEventApiCapability('ANALYTICS_READ', OTHER))).toBe(true)
      expect(allowed(await requireApiCapability('MARKETING_MANAGE'))).toBe(true)
      expect(allowed(await requireApiCapability('ARTIST_READ'))).toBe(true)
      expect(allowed(await requireApiCapability('TICKET_SCAN'))).toBe(false)
      expect(allowed(await requireApiCapability('SALES_READ'))).toBe(false)
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
