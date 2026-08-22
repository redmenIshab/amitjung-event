import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const mockGetServerSession = vi.hoisted(() => vi.fn())
const assignmentFindMany = vi.hoisted(() => vi.fn())
const mockRedirect = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('REDIRECT')
  }),
)

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

  it('returns an empty array for an unassigned ORGANIZER', async () => {
    assignmentFindMany.mockResolvedValue([])
    expect(await visibleEventIds(sess('ORGANIZER') as never)).toEqual([])
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

  it('does not leak which event ids exist — same status for both refusals', async () => {
    mockGetServerSession.mockResolvedValue(sess('ORGANIZER'))
    assignmentFindMany.mockResolvedValue([{ eventId: 'e1' }])
    const outOfScope = await requireEventApiCapability('EVENT_READ', 'e2')
    const noCapability = await requireEventApiCapability('EVENT_WRITE', 'e1')
    expect((outOfScope as NextResponse).status).toBe((noCapability as NextResponse).status)
    expect(await (outOfScope as NextResponse).json()).toEqual(
      await (noCapability as NextResponse).json(),
    )
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

  it('returns the session for an in-scope organizer', async () => {
    mockGetServerSession.mockResolvedValue(sess('ORGANIZER'))
    assignmentFindMany.mockResolvedValue([{ eventId: 'e1' }])
    const s = await requireEventPageCapability('EVENT_READ', 'e1')
    expect(s.user.role).toBe('ORGANIZER')
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})
