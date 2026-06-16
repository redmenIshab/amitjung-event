import { describe, it, expect } from 'vitest'
import { createEventSchema, generateTicketSchema, registerSchema } from '@/lib/validations'

describe('createEventSchema', () => {
  it('accepts a valid event payload', () => {
    const result = createEventSchema.safeParse({
      name: 'Summer Beats',
      venue: 'Central Park',
      date: '2026-08-15T20:00:00Z',
      capacity: 500,
      description: 'Annual music festival',
      isOpen: true,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a negative capacity', () => {
    const result = createEventSchema.safeParse({
      name: 'Summer Beats',
      venue: 'Central Park',
      date: '2026-08-15T20:00:00Z',
      capacity: -1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a missing name', () => {
    const result = createEventSchema.safeParse({
      venue: 'Central Park',
      date: '2026-08-15T20:00:00Z',
      capacity: 100,
    })
    expect(result.success).toBe(false)
  })
})

describe('generateTicketSchema', () => {
  it('accepts a valid attendee payload', () => {
    const result = generateTicketSchema.safeParse({
      attendeeName: 'Jane Doe',
      attendeeEmail: 'jane@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const result = generateTicketSchema.safeParse({
      attendeeName: 'Jane Doe',
      attendeeEmail: 'not-an-email',
    })
    expect(result.success).toBe(false)
  })
})

describe('registerSchema', () => {
  it('accepts a valid registration payload', () => {
    const result = registerSchema.safeParse({
      attendeeName: 'John Smith',
      attendeeEmail: 'john@example.com',
    })
    expect(result.success).toBe(true)
  })
})
