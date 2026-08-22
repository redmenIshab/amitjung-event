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

describe('jwt callback — password reset revokes existing sessions', () => {
  beforeEach(() => {
    userFindUnique.mockReset()
    assignmentFindMany.mockReset()
  })

  it('revokes a session minted before the password was reset', async () => {
    // The token carries the stamp it was issued with; the row now has a newer
    // one. With JWT sessions this comparison is the only thing that evicts
    // whoever is already signed in on a compromised account.
    userFindUnique.mockResolvedValue({
      role: 'ADMIN',
      deletedAt: null,
      passwordChangedAt: new Date('2026-08-22T14:02:00Z'),
    })
    const out = await call({ id: 'u1', role: 'ADMIN', pwdAt: 0 })
    expect(out.role).toBe('USER')
  })

  it('keeps a session minted after the reset', async () => {
    const stamp = new Date('2026-08-22T14:02:00Z')
    userFindUnique.mockResolvedValue({ role: 'ADMIN', deletedAt: null, passwordChangedAt: stamp })
    const out = await call({ id: 'u1', role: 'ADMIN', pwdAt: stamp.getTime() })
    expect(out.role).toBe('ADMIN')
  })

  it('leaves accounts that never reset their password alone', async () => {
    userFindUnique.mockResolvedValue({ role: 'STAFF', deletedAt: null, passwordChangedAt: null })
    const out = await call({ id: 'u1', role: 'STAFF', pwdAt: 0 })
    expect(out.role).toBe('STAFF')
  })

  it('stays revoked on the refresh after — the downgrade is not self-healing', async () => {
    // The stale token keeps its old stamp forever, so it must fail the check
    // every time rather than recovering once its role is re-read.
    userFindUnique.mockResolvedValue({
      role: 'ADMIN',
      deletedAt: null,
      passwordChangedAt: new Date('2026-08-22T14:02:00Z'),
    })
    const first = await call({ id: 'u1', role: 'ADMIN', pwdAt: 0 })
    const second = await call({ id: 'u1', role: first.role, pwdAt: first.pwdAt ?? 0 })
    expect(second.role).toBe('USER')
  })

  it('does not mass-revoke sessions minted before this feature shipped', async () => {
    // Tokens issued before pwdAt existed carry no stamp, and accounts that
    // never reset have none either — both read as 0, so they match. Getting
    // this wrong would sign out every staff member on deploy.
    userFindUnique.mockResolvedValue({ role: 'MANAGER', deletedAt: null, passwordChangedAt: null })
    const out = await call({ id: 'u1', role: 'MANAGER' })
    expect(out.role).toBe('MANAGER')
  })

  it('revokes an organizer’s event scope along with the role', async () => {
    userFindUnique.mockResolvedValue({
      role: 'ORGANIZER',
      deletedAt: null,
      passwordChangedAt: new Date('2026-08-22T14:02:00Z'),
    })
    const out = await call({ id: 'u1', role: 'ORGANIZER', pwdAt: 0, eventIds: ['e1'] })
    expect(out.role).toBe('USER')
    expect(out.eventIds).toEqual([])
  })
})
