import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * End-to-end authorization over the REAL route handlers.
 *
 * The sweep in `organizer-authorization.test.ts` exercises the gates directly;
 * this drives the actual exported `GET`/`POST` functions with a signed-in
 * session, so a route that forgets to call a gate — or calls the unscoped one —
 * is caught here. Only the database and mailer are mocked.
 */

const mockGetServerSession = vi.hoisted(() => vi.fn())
const assignmentFindMany = vi.hoisted(() => vi.fn())
const ticketFindMany = vi.hoisted(() => vi.fn())
const ticketGroupBy = vi.hoisted(() => vi.fn())
const checkInFindMany = vi.hoisted(() => vi.fn())
const artistFindMany = vi.hoisted(() => vi.fn())
const transaction = vi.hoisted(() => vi.fn())

vi.mock('next-auth/next', () => ({ getServerSession: mockGetServerSession }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    eventAssignment: { findMany: assignmentFindMany },
    ticket: { findMany: ticketFindMany, groupBy: ticketGroupBy },
    checkIn: { findMany: checkInFindMany },
    artist: { findMany: artistFindMany },
    $transaction: transaction,
  },
}))

// The ticket route pulls in the mailer, which constructs a Resend client at
// module load and throws without an API key.
vi.mock('@/lib/email', () => ({
  isEmailEnabled: () => false,
  sendTicketEmail: vi.fn(),
  sendStaffCredentialsEmail: vi.fn(),
}))

import { GET as ticketsGET } from '@/app/api/events/[eventId]/tickets/route'
import { GET as analyticsGET } from '@/app/api/events/[eventId]/analytics/route'
import { POST as verifyPOST } from '@/app/api/verify/[token]/route'
import { GET as artistsGET } from '@/app/api/artist/route'

const ASSIGNED = 'event-assigned'
const OTHER = 'event-other'

function signIn(role: string) {
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1', role } })
  assignmentFindMany.mockResolvedValue(role === 'ORGANIZER' ? [{ eventId: ASSIGNED }] : [])
}

const req = () => new Request('http://localhost')
const eventParams = (eventId: string) => ({ params: Promise.resolve({ eventId }) })

beforeEach(() => {
  mockGetServerSession.mockReset()
  assignmentFindMany.mockReset()
  ticketFindMany.mockReset().mockResolvedValue([])
  ticketGroupBy.mockReset().mockResolvedValue([])
  checkInFindMany.mockReset().mockResolvedValue([])
  artistFindMany.mockReset().mockResolvedValue([])
  transaction.mockReset()
})

describe('GET /api/events/[eventId]/tickets — attendee PII', () => {
  it('serves an organizer their own event', async () => {
    signIn('ORGANIZER')
    const res = await ticketsGET(req(), eventParams(ASSIGNED))
    expect(res.status).toBe(200)
  })

  it('403s an organizer on another event, and reads no tickets', async () => {
    signIn('ORGANIZER')
    const res = await ticketsGET(req(), eventParams(OTHER))
    expect(res.status).toBe(403)
    expect(ticketFindMany).not.toHaveBeenCalled()
  })

  it('401s an anonymous caller', async () => {
    mockGetServerSession.mockResolvedValue(null)
    const res = await ticketsGET(req(), eventParams(ASSIGNED))
    expect(res.status).toBe(401)
    expect(ticketFindMany).not.toHaveBeenCalled()
  })

  it('still serves STAFF any event (regression)', async () => {
    signIn('STAFF')
    expect((await ticketsGET(req(), eventParams(OTHER))).status).toBe(200)
  })
})

describe('GET /api/events/[eventId]/analytics', () => {
  it('serves an organizer their own event', async () => {
    signIn('ORGANIZER')
    expect((await analyticsGET(req(), eventParams(ASSIGNED))).status).toBe(200)
  })

  it('403s an organizer on another event, and runs no aggregate', async () => {
    signIn('ORGANIZER')
    const res = await analyticsGET(req(), eventParams(OTHER))
    expect(res.status).toBe(403)
    expect(ticketGroupBy).not.toHaveBeenCalled()
  })

  it('still serves MANAGER any event (regression)', async () => {
    signIn('MANAGER')
    expect((await analyticsGET(req(), eventParams(OTHER))).status).toBe(200)
  })
})

describe('POST /api/verify/[token] — scanning', () => {
  /** A ticket for `eventId`, wired through the $transaction callback. */
  function ticketFor(eventId: string) {
    const update = vi.fn()
    const create = vi.fn()
    transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn({
        ticket: {
          findUnique: vi.fn().mockResolvedValue({
            id: 't1',
            status: 'UNUSED',
            eventId,
            attendeeName: 'Jane',
            attendeeEmail: 'j@x.co',
            distributorName: null,
            category: 'GENERAL',
            event: { name: eventId === ASSIGNED ? 'My Event' : 'Other Event' },
            checkIn: null,
          }),
          update,
        },
        checkIn: { create },
      }),
    )
    return { update, create }
  }

  const params = { params: Promise.resolve({ token: 'tok' }) }

  it('checks in a ticket for the organizer’s own event', async () => {
    signIn('ORGANIZER')
    const { update } = ticketFor(ASSIGNED)
    const res = await verifyPOST(req(), params)
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ valid: true })
    expect(update).toHaveBeenCalledOnce()
  })

  it('refuses another event’s ticket WITHOUT consuming it', async () => {
    signIn('ORGANIZER')
    const { update, create } = ticketFor(OTHER)
    const res = await verifyPOST(req(), params)
    const body = await res.json()
    expect(body).toMatchObject({ valid: false, reason: 'WRONG_EVENT', eventName: 'Other Event' })
    expect(update).not.toHaveBeenCalled()
    expect(create).not.toHaveBeenCalled()
  })

  it('lets STAFF scan any event (regression)', async () => {
    signIn('STAFF')
    const { update } = ticketFor(OTHER)
    const res = await verifyPOST(req(), params)
    expect(await res.json()).toMatchObject({ valid: true })
    expect(update).toHaveBeenCalledOnce()
  })

  it('403s a role without TICKET_SCAN, touching no ticket', async () => {
    signIn('MANAGER')
    const { update } = ticketFor(ASSIGNED)
    const res = await verifyPOST(req(), params)
    expect(res.status).toBe(403)
    expect(update).not.toHaveBeenCalled()
  })
})

describe('GET /api/artist — outside the organizer’s world', () => {
  it('403s an organizer', async () => {
    signIn('ORGANIZER')
    const res = await artistsGET()
    expect(res.status).toBe(403)
    expect(artistFindMany).not.toHaveBeenCalled()
  })

  it('still serves STAFF and MANAGER (regression)', async () => {
    for (const role of ['STAFF', 'MANAGER', 'ADMIN']) {
      signIn(role)
      expect((await artistsGET()).status).toBe(200)
    }
  })
})
