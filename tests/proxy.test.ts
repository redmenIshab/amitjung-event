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
