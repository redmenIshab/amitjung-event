import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const requireSession = vi.hoisted(() => vi.fn())
const participantFindUnique = vi.hoisted(() => vi.fn())
const userFindUnique = vi.hoisted(() => vi.fn())
const ticketCount = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rbac', () => ({ requireSession }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    participant: { findUnique: participantFindUnique },
    user: { findUnique: userFindUnique },
    ticket: { count: ticketCount },
  },
}))

import { GET } from '@/app/api/profile/route'

const session = (id: string, role: string) => ({ session: { user: { id, role } } })
const MADE = new Date('2026-01-15T00:00:00Z')

describe('GET /api/profile', () => {
  beforeEach(() => {
    requireSession.mockReset()
    participantFindUnique.mockReset()
    userFindUnique.mockReset()
    ticketCount.mockReset()
  })

  it('passes through the 401 from requireSession', async () => {
    requireSession.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    expect((await GET()).status).toBe(401)
  })

  it('reads Participant for a buyer session', async () => {
    requireSession.mockResolvedValue(session('p1', 'PARTICIPANT'))
    participantFindUnique.mockResolvedValue({
      name: 'Buyer',
      email: 'b@example.com',
      image: 'https://img/avatar.png',
      createdAt: MADE,
      deletedAt: null,
    })
    ticketCount.mockResolvedValue(3)

    const body = await (await GET()).json()

    expect(userFindUnique).not.toHaveBeenCalled()
    expect(body).toMatchObject({
      name: 'Buyer',
      accountType: 'Ticket holder',
      signInMethod: 'Google',
      ticketCount: 3,
    })
  })

  it('scopes the ticket count to the caller', async () => {
    requireSession.mockResolvedValue(session('p1', 'PARTICIPANT'))
    participantFindUnique.mockResolvedValue({
      name: 'Buyer',
      email: 'b@example.com',
      image: null,
      createdAt: MADE,
      deletedAt: null,
    })
    ticketCount.mockResolvedValue(0)

    await GET()

    expect(ticketCount).toHaveBeenCalledWith({ where: { booking: { participantId: 'p1' } } })
  })

  it('reads User for a non-participant session', async () => {
    requireSession.mockResolvedValue(session('u1', 'USER'))
    userFindUnique.mockResolvedValue({
      name: 'Member',
      email: 'm@example.com',
      role: 'USER',
      createdAt: MADE,
      deletedAt: null,
    })

    const body = await (await GET()).json()

    expect(participantFindUnique).not.toHaveBeenCalled()
    expect(body).toMatchObject({
      name: 'Member',
      accountType: 'Member',
      signInMethod: 'Email & password',
      ticketCount: null,
    })
  })

  it('labels a staff account by its role', async () => {
    requireSession.mockResolvedValue(session('u2', 'ADMIN'))
    userFindUnique.mockResolvedValue({
      name: 'Boss',
      email: 'a@example.com',
      role: 'ADMIN',
      createdAt: MADE,
      deletedAt: null,
    })

    expect((await (await GET()).json()).accountType).toBe('Staff · ADMIN')
  })

  it('404s a deactivated staff account', async () => {
    requireSession.mockResolvedValue(session('u1', 'USER'))
    userFindUnique.mockResolvedValue({
      name: 'Gone',
      email: 'g@example.com',
      role: 'USER',
      createdAt: MADE,
      deletedAt: new Date(),
    })

    expect((await GET()).status).toBe(404)
  })

  it('404s a soft-deleted participant', async () => {
    requireSession.mockResolvedValue(session('p1', 'PARTICIPANT'))
    participantFindUnique.mockResolvedValue({
      name: 'Gone',
      email: 'g@example.com',
      image: null,
      createdAt: MADE,
      deletedAt: new Date(),
    })

    expect((await GET()).status).toBe(404)
  })

  it('404s when the row is missing entirely', async () => {
    requireSession.mockResolvedValue(session('u1', 'USER'))
    userFindUnique.mockResolvedValue(null)

    expect((await GET()).status).toBe(404)
  })

  it('never returns a password field', async () => {
    requireSession.mockResolvedValue(session('u1', 'USER'))
    userFindUnique.mockResolvedValue({
      name: 'Member',
      email: 'm@example.com',
      role: 'USER',
      createdAt: MADE,
      deletedAt: null,
    })

    expect(Object.keys(await (await GET()).json())).not.toContain('password')
  })
})
