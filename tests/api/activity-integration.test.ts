import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

/**
 * End-to-end integration for the activity log.
 *
 * Drives the REAL route handlers through the REAL gates (`rbac.ts` +
 * `eventAccess.ts`) against a mocked database — only Prisma and the mailer are
 * stubbed. This is the suite that catches a route which forgets to log, logs
 * outside its transaction, or lets the wrong role act.
 */

const mockGetServerSession = vi.hoisted(() => vi.fn())
const assignmentFindMany = vi.hoisted(() => vi.fn())
const ticketFindFirst = vi.hoisted(() => vi.fn())
const transaction = vi.hoisted(() => vi.fn())

vi.mock('next-auth/next', () => ({ getServerSession: mockGetServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    eventAssignment: { findMany: assignmentFindMany },
    ticket: { findFirst: ticketFindFirst },
    $transaction: transaction,
  },
}))
vi.mock('@/lib/email', () => ({
  isEmailEnabled: () => false,
  sendTicketEmail: vi.fn(),
  sendStaffCredentialsEmail: vi.fn(),
}))

import { PATCH as cancelPATCH } from '@/app/api/events/[eventId]/tickets/[ticketId]/route'
import { POST as refundPOST } from '@/app/api/events/[eventId]/tickets/[ticketId]/refund/route'

const EVENT = 'e1'
const OTHER = 'e-other'

function signIn(role: string) {
  mockGetServerSession.mockResolvedValue({
    user: { id: 'u1', role, name: 'Sita', email: 'sita@lyante.art' },
  })
  assignmentFindMany.mockResolvedValue(role === 'ORGANIZER' ? [{ eventId: EVENT }] : [])
}

const params = (eventId = EVENT) => ({
  params: Promise.resolve({ eventId, ticketId: 't1' }),
})
const body = (b: unknown, method: string) =>
  new Request('http://localhost', { method, body: JSON.stringify(b) })

/** Transaction client capturing every activity write. */
function wireTx(ticketsUnderPayment: { id: string; status: string }[] = []) {
  const logged: Record<string, unknown>[] = []
  const spies = {
    ticketUpdate: vi.fn(),
    ticketUpdateMany: vi.fn(),
    paymentUpdate: vi.fn(),
  }
  transaction.mockImplementation((fn: (c: unknown) => unknown) =>
    fn({
      ticket: {
        update: spies.ticketUpdate,
        updateMany: spies.ticketUpdateMany,
        findMany: vi.fn().mockResolvedValue(ticketsUnderPayment),
      },
      payment: { update: spies.paymentUpdate },
      ticketActivity: {
        create: vi.fn((args: { data: Record<string, unknown> }) => {
          logged.push(args.data)
          return args.data
        }),
      },
    }),
  )
  return { logged, ...spies }
}

const paidTicket = {
  id: 't1',
  eventId: EVENT,
  status: 'UNUSED',
  booking: { payment: { id: 'p1', finalAmount: 4500, paymentStatus: 'PAID' } },
}

beforeEach(() => {
  mockGetServerSession.mockReset()
  assignmentFindMany.mockReset()
  ticketFindFirst.mockReset()
  transaction.mockReset()
})

describe('cancel — authorization across roles', () => {
  it('ADMIN may cancel', async () => {
    signIn('ADMIN')
    ticketFindFirst.mockResolvedValue({ ...paidTicket })
    wireTx()
    expect((await cancelPATCH(body({ reason: 'dupe' }, 'PATCH'), params())).status).toBe(200)
  })

  for (const role of ['STAFF', 'MANAGER', 'ORGANIZER', 'USER', 'PARTICIPANT']) {
    it(`${role} may not cancel`, async () => {
      signIn(role)
      ticketFindFirst.mockResolvedValue({ ...paidTicket })
      const res = await cancelPATCH(body({ reason: 'dupe' }, 'PATCH'), params())
      expect(res.status).toBe(403)
      expect(transaction).not.toHaveBeenCalled()
    })
  }

  it('401s an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null)
    expect((await cancelPATCH(body({ reason: 'x' }, 'PATCH'), params())).status).toBe(401)
  })
})

describe('refund — authorization across roles', () => {
  it('ADMIN may refund', async () => {
    signIn('ADMIN')
    ticketFindFirst.mockResolvedValue({ ...paidTicket })
    wireTx([{ id: 't1', status: 'UNUSED' }])
    expect((await refundPOST(body({ reason: 'req' }, 'POST'), params())).status).toBe(200)
  })

  for (const role of ['STAFF', 'MANAGER', 'ORGANIZER']) {
    it(`${role} may not refund`, async () => {
      signIn(role)
      ticketFindFirst.mockResolvedValue({ ...paidTicket })
      const res = await refundPOST(body({ reason: 'req' }, 'POST'), params())
      expect(res.status).toBe(403)
      expect(transaction).not.toHaveBeenCalled()
    })
  }
})

describe('event scoping still applies to the new actions', () => {
  it('an organizer cannot reach another event, even lacking the capability anyway', async () => {
    signIn('ORGANIZER')
    ticketFindFirst.mockResolvedValue({ ...paidTicket, eventId: OTHER })
    const res = await cancelPATCH(body({ reason: 'x' }, 'PATCH'), params(OTHER))
    expect(res.status).toBe(403)
  })

  it('a ticket id from another event is not found through this event’s URL', async () => {
    signIn('ADMIN')
    ticketFindFirst.mockResolvedValue(null)
    const res = await cancelPATCH(body({ reason: 'x' }, 'PATCH'), params())
    expect(res.status).toBe(404)
    expect(ticketFindFirst.mock.calls[0][0].where).toMatchObject({ id: 't1', eventId: EVENT })
  })
})

describe('the refund cascade, end to end', () => {
  it('marks the payment, cancels every ticket, and logs both — all in one transaction', async () => {
    signIn('ADMIN')
    ticketFindFirst.mockResolvedValue({ ...paidTicket })
    const tx = wireTx([
      { id: 't1', status: 'UNUSED' },
      { id: 't2', status: 'UNUSED' },
      { id: 't3', status: 'USED' },
    ])

    const res = await refundPOST(body({ reason: 'buyer request' }, 'POST'), params())
    const payload = await res.json()

    expect(res.status).toBe(200)
    expect(payload).toMatchObject({ paymentId: 'p1', amount: 4500, cancelled: 3, alreadyUsed: 1 })

    expect(tx.paymentUpdate).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { paymentStatus: 'REFUND' },
    })
    expect(tx.ticketUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['t1', 't2', 't3'] } },
      data: { status: 'CANCELLED' },
    })

    // Every write went through the SAME client the transaction handed out,
    // which is what makes the log and the state change atomic.
    expect(tx.logged).toHaveLength(2)
    expect(tx.logged[0]).toMatchObject({
      action: 'REFUNDED',
      amount: 4500,
      paymentId: 'p1',
      reason: 'buyer request',
      actorType: 'USER',
      actorLabel: 'Sita <sita@lyante.art>',
      actorRole: 'ADMIN',
      meta: { alreadyUsed: 1 },
    })
    expect(tx.logged[1]).toMatchObject({
      action: 'CANCELLED',
      quantity: 3,
      meta: { refundCascade: true },
    })
  })

  it('writes no log at all when the transaction throws', async () => {
    signIn('ADMIN')
    ticketFindFirst.mockResolvedValue({ ...paidTicket })
    transaction.mockRejectedValue(new Error('db down'))
    await expect(refundPOST(body({ reason: 'x' }, 'POST'), params())).rejects.toThrow('db down')
  })

  it('refuses a comped ticket without touching anything', async () => {
    signIn('ADMIN')
    ticketFindFirst.mockResolvedValue({
      ...paidTicket,
      booking: { payment: { id: 'p1', finalAmount: 0, paymentStatus: 'PAID' } },
    })
    const res = await refundPOST(body({ reason: 'x' }, 'POST'), params())
    expect(res.status).toBe(409)
    expect(transaction).not.toHaveBeenCalled()
  })
})

describe('cancel records the why, not just the what', () => {
  it('logs the reason and the actor', async () => {
    signIn('ADMIN')
    ticketFindFirst.mockResolvedValue({ ...paidTicket })
    const tx = wireTx()

    await cancelPATCH(body({ reason: 'duplicate purchase' }, 'PATCH'), params())

    expect(tx.logged).toHaveLength(1)
    expect(tx.logged[0]).toMatchObject({
      action: 'CANCELLED',
      ticketId: 't1',
      eventId: EVENT,
      reason: 'duplicate purchase',
      actorLabel: 'Sita <sita@lyante.art>',
      actorRole: 'ADMIN',
    })
  })

  it('refuses to cancel without a reason, and logs nothing', async () => {
    signIn('ADMIN')
    ticketFindFirst.mockResolvedValue({ ...paidTicket })
    const res = await cancelPATCH(body({ reason: '   ' }, 'PATCH'), params())
    expect(res.status).toBe(422)
    expect(transaction).not.toHaveBeenCalled()
  })
})
