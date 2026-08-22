import { describe, it, expect } from 'vitest'
import { canAccessEvent, isEventScopedRole } from '@/lib/eventScope'

describe('isEventScopedRole', () => {
  it('is true only for ORGANIZER', () => {
    expect(isEventScopedRole('ORGANIZER')).toBe(true)
    expect(isEventScopedRole('ADMIN')).toBe(false)
    expect(isEventScopedRole('STAFF')).toBe(false)
    expect(isEventScopedRole('MANAGER')).toBe(false)
    expect(isEventScopedRole('USER')).toBe(false)
    expect(isEventScopedRole(undefined)).toBe(false)
  })
})

describe('canAccessEvent', () => {
  it('unscoped staff roles reach any event', () => {
    expect(canAccessEvent('ADMIN', undefined, 'e1')).toBe(true)
    expect(canAccessEvent('STAFF', [], 'e1')).toBe(true)
    expect(canAccessEvent('MANAGER', ['e2'], 'e1')).toBe(true)
  })

  it('ORGANIZER reaches only assigned events', () => {
    expect(canAccessEvent('ORGANIZER', ['e1', 'e2'], 'e1')).toBe(true)
    expect(canAccessEvent('ORGANIZER', ['e1', 'e2'], 'e3')).toBe(false)
  })

  it('ORGANIZER with no assignments reaches nothing', () => {
    expect(canAccessEvent('ORGANIZER', [], 'e1')).toBe(false)
    expect(canAccessEvent('ORGANIZER', undefined, 'e1')).toBe(false)
  })

  it('never grants access on an empty event id', () => {
    expect(canAccessEvent('ORGANIZER', ['e1'], '')).toBe(false)
  })
})
