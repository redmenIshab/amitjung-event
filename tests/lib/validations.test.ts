import { describe, it, expect } from 'vitest'
import {
  createEventSchema,
  updateEventSchema,
  generateTicketSchema,
  registerSchema,
} from '@/lib/validations'

describe('createEventSchema', () => {
  it('accepts a valid event payload', () => {
    const result = createEventSchema.safeParse({
      name: 'Summer Beats',
      venue: 'Central Park',
      date: '2026-08-15T20:00:00Z',
      capacity: 500,
      ticketsAvailable: 500,
      baseTicketPrice: 4500,
      commissionPercentage: 12,
      description: 'Annual music festival',
      isOpen: true,
    })
    expect(result.success).toBe(true)
  })

  // Commission drives reported income, so it must never be defaulted silently.
  it('rejects a payload with no commission rate', () => {
    const result = createEventSchema.safeParse({
      name: 'Summer Beats',
      venue: 'Central Park',
      date: '2026-08-15T20:00:00Z',
      capacity: 500,
      ticketsAvailable: 500,
      baseTicketPrice: 4500,
    })
    expect(result.success).toBe(false)
  })

  it('accepts a 0% commission rate', () => {
    const result = createEventSchema.safeParse({
      name: 'Summer Beats',
      venue: 'Central Park',
      date: '2026-08-15T20:00:00Z',
      capacity: 500,
      ticketsAvailable: 500,
      baseTicketPrice: 4500,
      commissionPercentage: 0,
    })
    expect(result.success).toBe(true)
  })

  it.each([-5, 101, 12.5])('rejects an out-of-range commission rate: %s', (rate) => {
    const result = createEventSchema.safeParse({
      name: 'Summer Beats',
      venue: 'Central Park',
      date: '2026-08-15T20:00:00Z',
      capacity: 500,
      ticketsAvailable: 500,
      baseTicketPrice: 4500,
      commissionPercentage: rate,
    })
    expect(result.success).toBe(false)
  })

  it('rejects ticketsAvailable exceeding capacity', () => {
    const result = createEventSchema.safeParse({
      name: 'Summer Beats',
      venue: 'Central Park',
      date: '2026-08-15T20:00:00Z',
      capacity: 100,
      ticketsAvailable: 200,
      baseTicketPrice: 4500,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a negative capacity', () => {
    const result = createEventSchema.safeParse({
      name: 'Summer Beats',
      venue: 'Central Park',
      date: '2026-08-15T20:00:00Z',
      capacity: -1,
      baseTicketPrice: 4500,
    })
    expect(result.success).toBe(false)
  })

  it('rejects a missing name', () => {
    const result = createEventSchema.safeParse({
      venue: 'Central Park',
      date: '2026-08-15T20:00:00Z',
      capacity: 100,
      baseTicketPrice: 4500,
    })
    expect(result.success).toBe(false)
  })
})

describe('updateEventSchema', () => {
  it('accepts an artist reassignment', () => {
    const result = updateEventSchema.safeParse({ artistId: 'artist_1' })
    expect(result.success).toBe(true)
  })

  // "None" in the edit form must clear the relation, not write an empty id.
  it('accepts a null artistId to unassign the artist', () => {
    const result = updateEventSchema.safeParse({ artistId: null })
    expect(result.success).toBe(true)
  })

  it('rejects an empty-string artistId', () => {
    const result = updateEventSchema.safeParse({ artistId: '' })
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
