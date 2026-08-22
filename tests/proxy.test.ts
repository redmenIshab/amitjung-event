import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockGetToken = vi.hoisted(() => vi.fn())
vi.mock('next-auth/jwt', () => ({ getToken: mockGetToken }))

import { proxy } from '@/proxy'

const req = (path = '/admin/dashboard') => new NextRequest(new URL('http://localhost' + path))

describe('proxy backstop', () => {
  beforeEach(() => mockGetToken.mockReset())
  it('redirects to /login when no token', async () => {
    mockGetToken.mockResolvedValue(null)
    const res = await proxy(req())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })
  it('redirects when role lacks DASHBOARD_VIEW', async () => {
    mockGetToken.mockResolvedValue({ role: 'PARTICIPANT' })
    const res = await proxy(req())
    expect(res.headers.get('location')).toContain('/login')
  })
  it('passes through for STAFF', async () => {
    mockGetToken.mockResolvedValue({ role: 'STAFF' })
    const res = await proxy(req())
    expect(res.headers.get('location')).toBeNull()
  })
})

describe('proxy — organizer event scoping', () => {
  beforeEach(() => mockGetToken.mockReset())

  const organizer = (eventIds: string[]) =>
    mockGetToken.mockResolvedValue({ role: 'ORGANIZER', id: 'u1', eventIds })

  it('allows an assigned event', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/e1'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('allows nested paths under an assigned event', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/e1/analytics'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('allows the activity log for an assigned event', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/e1/activity'))
    expect(res.headers.get('location')).toBeNull()
  })

  it('blocks the activity log of an unassigned event', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/e2/activity'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('blocks an unassigned event', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/e2'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('blocks the edit page even for an assigned event', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/e1/edit'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('blocks ticket generation for an assigned event', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/e1/tickets/new'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('blocks event creation', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/events/new'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('blocks user administration', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/users'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('blocks the artists area', async () => {
    organizer(['e1'])
    const res = await proxy(req('/admin/artists/a1/music'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('allows the scoped dashboard, scanner and event list', async () => {
    for (const path of ['/admin/dashboard', '/admin/scanner', '/admin/events']) {
      organizer(['e1'])
      const res = await proxy(req(path))
      expect(res.headers.get('location')).toBeNull()
    }
  })

  it('blocks an organizer with no assignments from any event', async () => {
    organizer([])
    const res = await proxy(req('/admin/events/e1'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('blocks an organizer whose token carries no scope at all', async () => {
    mockGetToken.mockResolvedValue({ role: 'ORGANIZER', id: 'u1' })
    const res = await proxy(req('/admin/events/e1'))
    expect(res.headers.get('location')).toContain('/admin/events')
  })

  it('leaves ADMIN unrestricted', async () => {
    for (const path of ['/admin/users', '/admin/events/e2/edit', '/admin/artists']) {
      mockGetToken.mockResolvedValue({ role: 'ADMIN', id: 'a1' })
      const res = await proxy(req(path))
      expect(res.headers.get('location')).toBeNull()
    }
  })

  it('still lets the login page through for an organizer', async () => {
    organizer([])
    const res = await proxy(req('/admin/login'))
    expect(res.headers.get('location')).toBeNull()
  })
})
