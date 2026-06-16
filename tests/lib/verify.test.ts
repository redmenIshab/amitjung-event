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
}

beforeEach(() => {
  vi.mocked(prisma.$transaction).mockImplementation((fn: any) => fn(mockTx))
  mockTx.ticket.findUnique.mockReset()
  mockTx.ticket.update.mockReset()
  mockTx.checkIn.create.mockReset()
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
