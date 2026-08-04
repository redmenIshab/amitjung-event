import { describe, it, expect, vi, beforeEach } from 'vitest'

const findUnique = vi.hoisted(() => vi.fn())
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique } } }))
vi.mock('bcryptjs', () => ({ default: { compare: vi.fn(), hash: vi.fn() } }))

import { authOptions } from '@/lib/auth'

/**
 * The real callback takes a fully-populated NextAuth params object. Tests pass
 * only the fields the callback reads, so go via `unknown` to loosen it.
 */
const jwt = authOptions.callbacks!.jwt as unknown as (args: {
  token: Record<string, unknown>
  user?: unknown
  account?: unknown
}) => Promise<Record<string, unknown>>

describe('jwt callback — live staff role re-check', () => {
  beforeEach(() => findUnique.mockReset())

  it('downgrades a deactivated user to USER', async () => {
    findUnique.mockResolvedValue({ role: 'ADMIN', deletedAt: new Date() })
    const token = await jwt({ token: { id: 'u1', role: 'ADMIN' } })
    expect(token.role).toBe('USER')
  })

  it('downgrades a deleted user to USER', async () => {
    findUnique.mockResolvedValue(null)
    const token = await jwt({ token: { id: 'u1', role: 'ADMIN' } })
    expect(token.role).toBe('USER')
  })

  it('picks up a role change made since login', async () => {
    findUnique.mockResolvedValue({ role: 'MANAGER', deletedAt: null })
    const token = await jwt({ token: { id: 'u1', role: 'ADMIN' } })
    expect(token.role).toBe('MANAGER')
  })

  it('keeps an active role unchanged', async () => {
    findUnique.mockResolvedValue({ role: 'STAFF', deletedAt: null })
    const token = await jwt({ token: { id: 'u1', role: 'STAFF' } })
    expect(token.role).toBe('STAFF')
  })

  it('skips the lookup for buyers', async () => {
    const token = await jwt({ token: { id: 'p1', role: 'PARTICIPANT' } })
    expect(findUnique).not.toHaveBeenCalled()
    expect(token.role).toBe('PARTICIPANT')
  })

  it('skips the lookup when the token carries no id', async () => {
    const token = await jwt({ token: { role: 'ADMIN' } })
    expect(findUnique).not.toHaveBeenCalled()
    expect(token.role).toBe('ADMIN')
  })

  it('does not re-read on the initial sign-in call', async () => {
    const token = await jwt({
      token: {},
      user: { id: 'u1', role: 'ADMIN' },
      account: { provider: 'credentials' },
    })
    expect(findUnique).not.toHaveBeenCalled()
    expect(token.role).toBe('ADMIN')
    expect(token.id).toBe('u1')
  })

  it('stamps PARTICIPANT on google sign-in', async () => {
    const token = await jwt({
      token: {},
      user: { id: 'p1' },
      account: { provider: 'google' },
    })
    expect(token.role).toBe('PARTICIPANT')
  })
})
