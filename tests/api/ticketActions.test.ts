import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

/**
 * Cancel and refund — the two state changes this feature introduces.
 *
 * The refund cascade is the risky one: it marks money refunded AND cancels the
 * tickets it paid for, so the tests pin that both happen through one
 * transaction client, that an already-scanned ticket is counted rather than
 * silently un-scanned, and that meaningless refunds are refused.
 */

const requireEventApiCapability = vi.hoisted(() => vi.fn())
const ticketFindFirst = vi.hoisted(() => vi.fn())
const transaction = vi.hoisted(() => vi.fn())

vi.mock('@/lib/eventAccess', () => ({ requireEventApiCapability }))
vi.mock('@/lib/prisma', () => ({
  prisma: { ticket: { findFirst: ticketFindFirst }, $transaction: transaction },
}))

import { PATCH } from '@/app/api/events/[eventId]/tickets/[ticketId]/route'
import { POST as refundPOST } from '@/app/api/events/[eventId]/tickets/[ticketId]/refund/route'

const params = { params: Promise.resolve({ eventId: 'e1', ticketId: 't1' }) }
const admin = { session: { user: { id: 'a1', role: 'ADMIN', name: 'Sita', email: 's@x.co' } } }

const body = (b: unknown, method = 'PATCH') =>
  new Request('http://localhost', { method, body: JSON.stringify(b) })

/** Wires a transaction client and returns its spies. */
function tx(over: Record<string, unknown> = {}) {
  const spies = {
    ticketUpdate: vi.fn(),
    ticketUpdateMany: vi.fn().mockResolvedValue({ count: 2 }),
    ticketFindMany: vi.fn().mockResolvedValue([]),
    paymentUpdate: vi.fn(),
    activityCreate: vi.fn(),
  }
  transaction.mockImplementation((fn: (c: unknown) => unknown) =>
    fn({
      ticket: {
        update: spies.ticketUpdate,
        updateMany: spies.ticketUpdateMany,
        findMany: spies.ticketFindMany,
      },
      payment: { update: spies.paymentUpdate },
      ticketActivity: { create: spies.activityCreate },
      ...over,
    }),
  )
  return spies
}

beforeEach(() => {
  requireEventApiCapability.mockReset().mockResolvedValue(admin)
  ticketFindFirst.mockReset()
  transaction.mockReset()
})

// ── Cancel ──────────────────────────────────────────────────────────────────

describe('PATCH /api/events/[eventId]/tickets/[ticketId] — cancel', () => {
  const unused = { id: 't1', eventId: 'e1', status: 'UNUSED', booking: null }

  it('requires TICKET_MANAGE scoped to the event', async () => {
    requireEventApiCapability.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    )
    const res = await PATCH(body({ reason: 'x' }), params)
    expect(res.status).toBe(403)
    expect(requireEventApiCapability).toHaveBeenCalledWith('TICKET_MANAGE', 'e1')
  })

  it('cancels an unused ticket and logs who and why', async () => {
    ticketFindFirst.mockResolvedValue(unused)
    const spies = tx()

    const res = await PATCH(body({ reason: 'duplicate purchase' }), params)

    expect(res.status).toBe(200)
    expect(spies.ticketUpdate).toHaveBeenCalledWith({
      where: { id: 't1' },
      data: { status: 'CANCELLED' },
    })
    expect(spies.activityCreate.mock.calls[0][0].data).toMatchObject({
      eventId: 'e1',
      action: 'CANCELLED',
      ticketId: 't1',
      reason: 'duplicate purchase',
      actorLabel: 'Sita <s@x.co>',
    })
  })

  it('requires a reason', async () => {
    ticketFindFirst.mockResolvedValue(unused)
    expect((await PATCH(body({ reason: '' }), params)).status).toBe(422)
    expect((await PATCH(body({}), params)).status).toBe(422)
    expect(transaction).not.toHaveBeenCalled()
  })

  it('404s an unknown ticket', async () => {
    ticketFindFirst.mockResolvedValue(null)
    expect((await PATCH(body({ reason: 'x' }), params)).status).toBe(404)
  })

  it('404s a ticket belonging to another event', async () => {
    // The route scopes its lookup by eventId, so a mismatched pair finds nothing.
    ticketFindFirst.mockResolvedValue(null)
    const res = await PATCH(body({ reason: 'x' }), params)
    expect(res.status).toBe(404)
    expect(ticketFindFirst.mock.calls[0][0].where).toMatchObject({ id: 't1', eventId: 'e1' })
  })

  it('409s an already-cancelled ticket', async () => {
    ticketFindFirst.mockResolvedValue({ ...unused, status: 'CANCELLED' })
    expect((await PATCH(body({ reason: 'x' }), params)).status).toBe(409)
    expect(transaction).not.toHaveBeenCalled()
  })

  it('allows cancelling a scanned ticket but records the override', async () => {
    ticketFindFirst.mockResolvedValue({ ...unused, status: 'USED' })
    const spies = tx()

    const res = await PATCH(body({ reason: 'fraud' }), params)

    expect(res.status).toBe(200)
    expect(spies.activityCreate.mock.calls[0][0].data.meta).toMatchObject({ wasUsed: true })
  })
})

// ── Refund ──────────────────────────────────────────────────────────────────

describe('POST /api/events/[eventId]/tickets/[ticketId]/refund', () => {
  const paid = {
    id: 't1',
    eventId: 'e1',
    status: 'UNUSED',
    booking: {
      payment: { id: 'p1', finalAmount: 4500, paymentStatus: 'PAID' },
    },
  }

  it('requires REFUND_MANAGE scoped to the event', async () => {
    requireEventApiCapability.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    )
    const res = await refundPOST(body({ reason: 'x' }, 'POST'), params)
    expect(res.status).toBe(403)
    expect(requireEventApiCapability).toHaveBeenCalledWith('REFUND_MANAGE', 'e1')
  })

  it('marks the payment refunded and cancels its tickets in one transaction', async () => {
    ticketFindFirst.mockResolvedValue(paid)
    const spies = tx()
    spies.ticketFindMany.mockResolvedValue([
      { id: 't1', status: 'UNUSED' },
      { id: 't2', status: 'UNUSED' },
    ])

    const res = await refundPOST(body({ reason: 'buyer request' }, 'POST'), params)

    expect(res.status).toBe(200)
    expect(spies.paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { paymentStatus: 'REFUND' },
    })
    expect(spies.ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['t1', 't2'] } },
      data: { status: 'CANCELLED' },
    })
  })

  it('writes a REFUNDED row with the amount and an aggregate CANCELLED row', async () => {
    ticketFindFirst.mockResolvedValue(paid)
    const spies = tx()
    spies.ticketFindMany.mockResolvedValue([{ id: 't1', status: 'UNUSED' }])

    await refundPOST(body({ reason: 'buyer request' }, 'POST'), params)

    const actions = spies.activityCreate.mock.calls.map((c) => c[0].data)
    expect(actions).toHaveLength(2)
    expect(actions[0]).toMatchObject({
      action: 'REFUNDED',
      paymentId: 'p1',
      amount: 4500,
      reason: 'buyer request',
      actorLabel: 'Sita <s@x.co>',
    })
    expect(actions[1]).toMatchObject({ action: 'CANCELLED', quantity: 1 })
  })

  it('counts already-scanned tickets and never reverts them', async () => {
    ticketFindFirst.mockResolvedValue(paid)
    const spies = tx()
    spies.ticketFindMany.mockResolvedValue([
      { id: 't1', status: 'UNUSED' },
      { id: 't2', status: 'USED' },
    ])

    const res = await refundPOST(body({ reason: 'buyer request' }, 'POST'), params)
    const payload = await res.json()

    expect(payload.alreadyUsed).toBe(1)
    const refundRow = spies.activityCreate.mock.calls[0][0].data
    expect(refundRow.meta).toMatchObject({ alreadyUsed: 1 })
    // Both are cancelled going forward, but the scan record stands.
    expect(spies.ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['t1', 't2'] } },
      data: { status: 'CANCELLED' },
    })
  })

  it('409s a payment that is already refunded', async () => {
    ticketFindFirst.mockResolvedValue({
      ...paid,
      booking: { payment: { id: 'p1', finalAmount: 4500, paymentStatus: 'REFUND' } },
    })
    expect((await refundPOST(body({ reason: 'x' }, 'POST'), params)).status).toBe(409)
    expect(transaction).not.toHaveBeenCalled()
  })

  it('409s a zero-value payment — a comped ticket has nothing to refund', async () => {
    ticketFindFirst.mockResolvedValue({
      ...paid,
      booking: { payment: { id: 'p1', finalAmount: 0, paymentStatus: 'PAID' } },
    })
    expect((await refundPOST(body({ reason: 'x' }, 'POST'), params)).status).toBe(409)
    expect(transaction).not.toHaveBeenCalled()
  })

  it('requires a reason', async () => {
    ticketFindFirst.mockResolvedValue(paid)
    expect((await refundPOST(body({}, 'POST'), params)).status).toBe(422)
    expect(transaction).not.toHaveBeenCalled()
  })

  it('rolls the log back with the state change when the transaction fails', async () => {
    ticketFindFirst.mockResolvedValue(paid)
    transaction.mockRejectedValue(new Error('db down'))
    await expect(refundPOST(body({ reason: 'x' }, 'POST'), params)).rejects.toThrow('db down')
  })
})
