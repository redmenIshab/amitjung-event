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

/* eslint-disable @typescript-eslint/no-explicit-any */
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

  it('drops stale scope when an organizer is promoted to staff', async () => {
    userFindUnique.mockResolvedValue({ role: 'STAFF', deletedAt: null })
    const out = await call({ id: 'u1', role: 'ORGANIZER', eventIds: ['e1'] })
    expect(out.role).toBe('STAFF')
    expect(out.eventIds).toBeUndefined()
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
