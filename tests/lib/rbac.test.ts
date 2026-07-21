import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

const mockGetServerSession = vi.hoisted(() => vi.fn())
vi.mock('next-auth/next', () => ({ getServerSession: mockGetServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

import { hasCapability, requireApiCapability } from '@/lib/rbac'
import type { AppRole, Capability } from '@/lib/rbac'

describe('hasCapability', () => {
  const cases: [AppRole, Capability, boolean][] = [
    ['ADMIN', 'EVENT_WRITE', true],
    ['STAFF', 'EVENT_WRITE', false],
    ['MANAGER', 'EVENT_WRITE', false],
    ['ADMIN', 'TICKET_SCAN', true],
    ['STAFF', 'TICKET_SCAN', true],
    ['MANAGER', 'TICKET_SCAN', false],
    ['MANAGER', 'ANALYTICS_READ', true],
    ['MANAGER', 'DASHBOARD_VIEW', true],
    ['PARTICIPANT', 'DASHBOARD_VIEW', false],
    ['USER', 'DASHBOARD_VIEW', false],
  ]
  it.each(cases)('%s + %s => %s', (role, cap, expected) => {
    expect(hasCapability(role, cap)).toBe(expected)
  })
  it('undefined role => false', () => {
    expect(hasCapability(undefined, 'DASHBOARD_VIEW')).toBe(false)
  })
})

describe('requireApiCapability', () => {
  beforeEach(() => mockGetServerSession.mockReset())
  it('401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const r = await requireApiCapability('EVENT_WRITE')
    expect(r).toBeInstanceOf(NextResponse)
    expect((r as NextResponse).status).toBe(401)
  })
  it('403 when role lacks capability', async () => {
    mockGetServerSession.mockResolvedValue({ user: { role: 'STAFF' } })
    const r = await requireApiCapability('EVENT_WRITE')
    expect(r).toBeInstanceOf(NextResponse)
    expect((r as NextResponse).status).toBe(403)
  })
  it('returns session when allowed', async () => {
    const session = { user: { role: 'ADMIN' } }
    mockGetServerSession.mockResolvedValue(session)
    const r = await requireApiCapability('EVENT_WRITE')
    expect(r).not.toBeInstanceOf(NextResponse)
    expect((r as { session: unknown }).session).toBe(session)
  })
})
