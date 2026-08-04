import { describe, it, expect } from 'vitest'
import { validateUserMutation, toStaffUserDto } from '@/lib/users'

const target = (over: Partial<{ id: string; role: string; active: boolean }> = {}) => ({
  id: 'u-target',
  role: 'STAFF',
  active: true,
  ...over,
})

describe('validateUserMutation — self-protection', () => {
  it('refuses changing your own role', () => {
    expect(
      validateUserMutation({
        actorId: 'u-me',
        target: target({ id: 'u-me', role: 'ADMIN' }),
        change: { role: 'STAFF' },
        otherActiveAdmins: 3,
      }),
    ).toMatch(/your own role/i)
  })

  it('refuses deactivating yourself', () => {
    expect(
      validateUserMutation({
        actorId: 'u-me',
        target: target({ id: 'u-me', role: 'ADMIN' }),
        change: { active: false },
        otherActiveAdmins: 3,
      }),
    ).toMatch(/your own account/i)
  })

  it('allows renaming yourself', () => {
    expect(
      validateUserMutation({
        actorId: 'u-me',
        target: target({ id: 'u-me', role: 'ADMIN' }),
        change: {},
        otherActiveAdmins: 0,
      }),
    ).toBeNull()
  })

  it('allows re-submitting your own unchanged role', () => {
    expect(
      validateUserMutation({
        actorId: 'u-me',
        target: target({ id: 'u-me', role: 'ADMIN' }),
        change: { role: 'ADMIN' },
        otherActiveAdmins: 0,
      }),
    ).toBeNull()
  })
})

describe('validateUserMutation — last active admin', () => {
  it('refuses demoting the last admin', () => {
    expect(
      validateUserMutation({
        actorId: 'u-me',
        target: target({ role: 'ADMIN' }),
        change: { role: 'MANAGER' },
        otherActiveAdmins: 0,
      }),
    ).toMatch(/last active admin/i)
  })

  it('refuses deactivating the last admin', () => {
    expect(
      validateUserMutation({
        actorId: 'u-me',
        target: target({ role: 'ADMIN' }),
        change: { active: false },
        otherActiveAdmins: 0,
      }),
    ).toMatch(/last active admin/i)
  })

  it('allows demoting an admin when another active admin remains', () => {
    expect(
      validateUserMutation({
        actorId: 'u-me',
        target: target({ role: 'ADMIN' }),
        change: { role: 'MANAGER' },
        otherActiveAdmins: 1,
      }),
    ).toBeNull()
  })

  it('ignores the last-admin rule for an already-deactivated admin', () => {
    expect(
      validateUserMutation({
        actorId: 'u-me',
        target: target({ role: 'ADMIN', active: false }),
        change: { role: 'STAFF' },
        otherActiveAdmins: 0,
      }),
    ).toBeNull()
  })

  it('allows reactivating the sole admin', () => {
    expect(
      validateUserMutation({
        actorId: 'u-me',
        target: target({ role: 'ADMIN', active: false }),
        change: { active: true },
        otherActiveAdmins: 0,
      }),
    ).toBeNull()
  })
})

describe('validateUserMutation — ordinary staff', () => {
  it.each([
    ['ADMIN' as const],
    ['MANAGER' as const],
    ['STAFF' as const],
  ])('allows promoting a staff member to %s', (role) => {
    expect(
      validateUserMutation({
        actorId: 'u-me',
        target: target(),
        change: { role },
        otherActiveAdmins: 1,
      }),
    ).toBeNull()
  })

  it('allows deactivating a non-admin', () => {
    expect(
      validateUserMutation({
        actorId: 'u-me',
        target: target(),
        change: { active: false },
        otherActiveAdmins: 1,
      }),
    ).toBeNull()
  })

  it('allows promoting a self-registered USER to staff', () => {
    expect(
      validateUserMutation({
        actorId: 'u-me',
        target: target({ role: 'USER' }),
        change: { role: 'STAFF' },
        otherActiveAdmins: 1,
      }),
    ).toBeNull()
  })
})

describe('toStaffUserDto', () => {
  const row = {
    id: 'u1',
    name: 'Ada',
    email: 'ada@example.com',
    role: 'STAFF',
    deletedAt: null as Date | null,
    createdAt: new Date('2026-08-04T10:00:00Z'),
  }

  it('maps deletedAt to an active flag', () => {
    expect(toStaffUserDto(row).active).toBe(true)
    expect(toStaffUserDto({ ...row, deletedAt: new Date() }).active).toBe(false)
  })

  it('never carries a password field', () => {
    const dto = toStaffUserDto({ ...row, password: 'hunter2' } as never)
    expect(Object.keys(dto)).not.toContain('password')
  })
})
