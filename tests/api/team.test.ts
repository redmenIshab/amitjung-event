import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const requireApiCapability = vi.hoisted(() => vi.fn())
const assignmentFindMany = vi.hoisted(() => vi.fn())
const assignmentCreate = vi.hoisted(() => vi.fn())
const assignmentDeleteMany = vi.hoisted(() => vi.fn())
const userFindUnique = vi.hoisted(() => vi.fn())
const userCreate = vi.hoisted(() => vi.fn())
const eventFindUnique = vi.hoisted(() => vi.fn())

vi.mock('@/lib/rbac', () => ({ requireApiCapability }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    eventAssignment: {
      findMany: assignmentFindMany,
      create: assignmentCreate,
      deleteMany: assignmentDeleteMany,
    },
    user: { findUnique: userFindUnique, create: userCreate },
    event: { findUnique: eventFindUnique },
  },
}))
vi.mock('@/lib/email', () => ({
  isEmailEnabled: () => false,
  sendStaffCredentialsEmail: vi.fn(),
}))

import { GET, POST } from '@/app/api/events/[eventId]/team/route'
import { DELETE } from '@/app/api/events/[eventId]/team/[userId]/route'

const params = { params: Promise.resolve({ eventId: 'e1' }) }
const ok = { session: { user: { id: 'admin1', role: 'ADMIN' } } }
const post = (body: unknown) =>
  POST(
    new Request('http://localhost/api/events/e1/team', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    params,
  )

const row = (over: Record<string, unknown> = {}) => ({
  id: 'u1',
  name: 'R',
  email: 'r@x.co',
  role: 'ORGANIZER',
  deletedAt: null,
  createdAt: new Date('2026-01-01'),
  ...over,
})

describe('organizer team API', () => {
  beforeEach(() => {
    requireApiCapability.mockReset().mockResolvedValue(ok)
    assignmentFindMany.mockReset()
    assignmentCreate.mockReset()
    assignmentDeleteMany.mockReset()
    userFindUnique.mockReset()
    userCreate.mockReset()
    eventFindUnique.mockReset().mockResolvedValue({ id: 'e1' })
  })

  it('requires USER_MANAGE', async () => {
    requireApiCapability.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    )
    const res = await GET(new Request('http://localhost'), params)
    expect(res.status).toBe(403)
    expect(requireApiCapability).toHaveBeenCalledWith('USER_MANAGE')
  })

  it('requires USER_MANAGE on POST too', async () => {
    requireApiCapability.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    )
    const res = await post({ userId: 'u1' })
    expect(res.status).toBe(403)
    expect(userCreate).not.toHaveBeenCalled()
    expect(assignmentCreate).not.toHaveBeenCalled()
  })

  it('lists current members without password fields', async () => {
    assignmentFindMany.mockResolvedValue([{ user: row() }])
    const res = await GET(new Request('http://localhost'), params)
    const body = await res.json()
    expect(body[0].id).toBe('u1')
    expect(body[0]).not.toHaveProperty('password')
  })

  it('assigns an existing user', async () => {
    userFindUnique.mockResolvedValue(row())
    const res = await post({ userId: 'u1' })
    expect(res.status).toBe(201)
    expect(assignmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { userId: 'u1', eventId: 'e1' } }),
    )
  })

  it('404s when the event does not exist', async () => {
    eventFindUnique.mockResolvedValue(null)
    const res = await post({ userId: 'u1' })
    expect(res.status).toBe(404)
    expect(assignmentCreate).not.toHaveBeenCalled()
  })

  it('404s when the user does not exist', async () => {
    userFindUnique.mockResolvedValue(null)
    const res = await post({ userId: 'nope' })
    expect(res.status).toBe(404)
  })

  it('creates an ORGANIZER account when given credentials', async () => {
    userCreate.mockResolvedValue(row({ id: 'u2', name: 'S', email: 's@x.co' }))
    const res = await post({ name: 'S', email: 's@x.co', password: 'longenough1' })
    expect(res.status).toBe(201)
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'ORGANIZER' }) }),
    )
    // Mail is disabled, so the password comes back for the admin to pass on.
    expect((await res.json()).password).toBe('longenough1')
  })

  it('never stores the password in the clear', async () => {
    userCreate.mockResolvedValue(row({ id: 'u2' }))
    await post({ name: 'S', email: 's@x.co', password: 'longenough1' })
    const stored = userCreate.mock.calls[0][0].data.password
    expect(stored).not.toBe('longenough1')
    expect(stored).toMatch(/^\$2[aby]\$/)
  })

  it('rejects a short password', async () => {
    const res = await post({ name: 'S', email: 's@x.co', password: 'short' })
    expect(res.status).toBe(422)
    expect(userCreate).not.toHaveBeenCalled()
  })

  it('rejects a body that is neither shape', async () => {
    const res = await post({ nonsense: true })
    expect(res.status).toBe(422)
  })

  it('unassigns a member', async () => {
    assignmentDeleteMany.mockResolvedValue({ count: 1 })
    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ eventId: 'e1', userId: 'u1' }),
    })
    expect(res.status).toBe(204)
    expect(assignmentDeleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', eventId: 'e1' },
    })
  })

  it('unassigning requires USER_MANAGE', async () => {
    requireApiCapability.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    )
    const res = await DELETE(new Request('http://localhost', { method: 'DELETE' }), {
      params: Promise.resolve({ eventId: 'e1', userId: 'u1' }),
    })
    expect(res.status).toBe(403)
    expect(assignmentDeleteMany).not.toHaveBeenCalled()
  })
})
