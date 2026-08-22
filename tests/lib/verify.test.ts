import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyTicket } from '@/lib/verify'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'

const mockTx = {
  ticket: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  checkIn: {
    create: vi.fn(),
  },
  ticketActivity: {
    create: vi.fn(),
  },
}

beforeEach(() => {
  vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(mockTx))
  mockTx.ticket.findUnique.mockReset()
  mockTx.ticket.update.mockReset()
  mockTx.checkIn.create.mockReset()
  mockTx.ticketActivity.create.mockReset()
})

describe('verifyTicket', () => {
  it('marks an UNUSED ticket as USED and returns valid=true', async () => {
    const ticket = {
      id: 'ticket-1',
      token: 'tok-abc',
      status: 'UNUSED',
      attendeeName: 'Jane Doe',
      attendeeEmail: 'jane@example.com',
      event: { name: 'Summer Beats' },
      checkIn: null,
    }
    mockTx.ticket.findUnique.mockResolvedValue(ticket)
    mockTx.ticket.update.mockResolvedValue({ ...ticket, status: 'USED' })
    mockTx.checkIn.create.mockResolvedValue({ id: 'ci-1', scannedAt: new Date() })

    const result = await verifyTicket('tok-abc')

    expect(result.valid).toBe(true)
    expect(mockTx.ticket.update).toHaveBeenCalledWith({
      where: { id: 'ticket-1' },
      data: { status: 'USED' },
    })
    expect(mockTx.checkIn.create).toHaveBeenCalledWith({
      data: { ticketId: 'ticket-1' },
    })
  })

  it('returns valid=false with reason ALREADY_USED when ticket is already used', async () => {
    const scannedAt = new Date()
    mockTx.ticket.findUnique.mockResolvedValue({
      id: 'ticket-1',
      status: 'USED',
      checkIn: { scannedAt },
      event: { name: 'Summer Beats' },
    })

    const result = await verifyTicket('tok-abc')

    expect(result.valid).toBe(false)
    expect((result as any).reason).toBe('ALREADY_USED')
    expect((result as any).usedAt).toEqual(scannedAt)
    expect(mockTx.ticket.update).not.toHaveBeenCalled()
  })

  it('returns valid=false with reason NOT_FOUND when token does not exist', async () => {
    mockTx.ticket.findUnique.mockResolvedValue(null)

    const result = await verifyTicket('nonexistent-token')

    expect(result.valid).toBe(false)
    expect((result as any).reason).toBe('NOT_FOUND')
  })

  it('returns valid=false with reason CANCELLED when ticket is cancelled', async () => {
    mockTx.ticket.findUnique.mockResolvedValue({
      id: 'ticket-1',
      status: 'CANCELLED',
      checkIn: null,
      event: { name: 'Summer Beats' },
    })

    const result = await verifyTicket('tok-abc')

    expect(result.valid).toBe(false)
    expect((result as any).reason).toBe('CANCELLED')
  })
})

describe('verifyTicket — event scope', () => {
  const scopedTicket = (eventId: string, name: string) => ({
    id: 'ticket-1',
    token: 'tok-abc',
    status: 'UNUSED',
    eventId,
    attendeeName: 'Jane Doe',
    attendeeEmail: 'jane@example.com',
    distributorName: null,
    category: 'GENERAL',
    event: { name },
    checkIn: null,
  })

  it('refuses a ticket outside the allowed events without consuming it', async () => {
    mockTx.ticket.findUnique.mockResolvedValue(scopedTicket('e2', 'Other Event'))

    const result = await verifyTicket('tok-abc', { allowedEventIds: ['e1'] })

    expect(result).toEqual({ valid: false, reason: 'WRONG_EVENT', eventName: 'Other Event' })
    expect(mockTx.ticket.update).not.toHaveBeenCalled()
    expect(mockTx.checkIn.create).not.toHaveBeenCalled()
  })

  it('checks in a ticket that is inside the allowed events', async () => {
    mockTx.ticket.findUnique.mockResolvedValue(scopedTicket('e1', 'My Event'))

    const result = await verifyTicket('tok-abc', { allowedEventIds: ['e1'] })

    expect(result.valid).toBe(true)
    expect(mockTx.ticket.update).toHaveBeenCalledOnce()
    expect(mockTx.checkIn.create).toHaveBeenCalledOnce()
  })

  it('refuses everything when the scanner has no assigned events', async () => {
    mockTx.ticket.findUnique.mockResolvedValue(scopedTicket('e1', 'My Event'))

    const result = await verifyTicket('tok-abc', { allowedEventIds: [] })

    expect((result as any).reason).toBe('WRONG_EVENT')
    expect(mockTx.ticket.update).not.toHaveBeenCalled()
  })

  it('null scope is unrestricted — unchanged behaviour for ADMIN/STAFF', async () => {
    mockTx.ticket.findUnique.mockResolvedValue(scopedTicket('e2', 'Other Event'))

    const result = await verifyTicket('tok-abc', { allowedEventIds: null })

    expect(result.valid).toBe(true)
    expect(mockTx.ticket.update).toHaveBeenCalledOnce()
  })

  it('scope is checked before the already-used branch, so no state leaks', async () => {
    mockTx.ticket.findUnique.mockResolvedValue({
      ...scopedTicket('e2', 'Other Event'),
      status: 'USED',
      checkIn: { scannedAt: new Date() },
    })

    const result = await verifyTicket('tok-abc', { allowedEventIds: ['e1'] })

    // WRONG_EVENT, not ALREADY_USED — an out-of-scope scanner learns nothing
    // about whether the ticket has been used.
    expect((result as any).reason).toBe('WRONG_EVENT')
  })
})

describe('verifyTicket — activity logging', () => {
  const unusedTicket = {
    id: 'ticket-1',
    token: 'tok-abc',
    status: 'UNUSED',
    eventId: 'e1',
    attendeeName: 'Jane Doe',
    attendeeEmail: 'jane@example.com',
    distributorName: null,
    category: 'GENERAL',
    event: { name: 'Summer Beats' },
    checkIn: null,
  }

  const scanner = {
    actorType: 'USER' as const,
    actorId: 'u1',
    actorLabel: 'Ramesh <ramesh@crew.np>',
    actorRole: 'ORGANIZER',
  }

  it('writes exactly one SCANNED row naming the scanner', async () => {
    mockTx.ticket.findUnique.mockResolvedValue(unusedTicket)

    await verifyTicket('tok-abc', { actor: scanner })

    expect(mockTx.ticketActivity.create).toHaveBeenCalledOnce()
    expect(mockTx.ticketActivity.create.mock.calls[0][0].data).toMatchObject({
      eventId: 'e1',
      action: 'SCANNED',
      ticketId: 'ticket-1',
      actorId: 'u1',
      actorLabel: 'Ramesh <ramesh@crew.np>',
      actorRole: 'ORGANIZER',
    })
  })

  it('logs the check-in through the SAME transaction client', async () => {
    mockTx.ticket.findUnique.mockResolvedValue(unusedTicket)
    await verifyTicket('tok-abc', { actor: scanner })
    // Asserting it went through mockTx (not the singleton) is what proves the
    // log entry and the status change are atomic.
    expect(mockTx.ticketActivity.create).toHaveBeenCalledOnce()
  })

  it('logs nothing when the scan is refused for the wrong event', async () => {
    mockTx.ticket.findUnique.mockResolvedValue({ ...unusedTicket, eventId: 'e2' })
    await verifyTicket('tok-abc', { allowedEventIds: ['e1'], actor: scanner })
    expect(mockTx.ticketActivity.create).not.toHaveBeenCalled()
  })

  it('logs nothing for an already-used ticket', async () => {
    mockTx.ticket.findUnique.mockResolvedValue({
      ...unusedTicket,
      status: 'USED',
      checkIn: { scannedAt: new Date() },
    })
    await verifyTicket('tok-abc', { actor: scanner })
    expect(mockTx.ticketActivity.create).not.toHaveBeenCalled()
  })

  it('logs nothing for a cancelled or missing ticket', async () => {
    mockTx.ticket.findUnique.mockResolvedValue({ ...unusedTicket, status: 'CANCELLED' })
    await verifyTicket('tok-abc', { actor: scanner })
    mockTx.ticket.findUnique.mockResolvedValue(null)
    await verifyTicket('tok-abc', { actor: scanner })
    expect(mockTx.ticketActivity.create).not.toHaveBeenCalled()
  })

  it('falls back to the system actor when none is supplied', async () => {
    mockTx.ticket.findUnique.mockResolvedValue(unusedTicket)
    await verifyTicket('tok-abc')
    expect(mockTx.ticketActivity.create.mock.calls[0][0].data).toMatchObject({
      actorType: 'SYSTEM',
      actorLabel: 'system',
    })
  })
})
