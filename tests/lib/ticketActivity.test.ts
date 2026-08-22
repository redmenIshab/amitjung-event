import { describe, it, expect, vi } from 'vitest'
import {
  SYSTEM_ACTOR,
  actorFromSession,
  recordTicketActivity,
} from '@/lib/ticketActivity'

/** A stand-in for a Prisma transaction client. */
function txClient() {
  const create = vi.fn().mockResolvedValue({ id: 'a1' })
  return { client: { ticketActivity: { create } }, create }
}

describe('actorFromSession', () => {
  it('labels a staff user with name, email and role', () => {
    const actor = actorFromSession({
      user: { id: 'u1', name: 'Sita Thapa', email: 'sita@lyante.art', role: 'ADMIN' },
    } as never)
    expect(actor).toEqual({
      actorType: 'USER',
      actorId: 'u1',
      actorLabel: 'Sita Thapa <sita@lyante.art>',
      actorRole: 'ADMIN',
    })
  })

  it('labels a buyer as PARTICIPANT', () => {
    const actor = actorFromSession({
      user: { id: 'p1', name: 'Buyer', email: 'buyer@x.co', role: 'PARTICIPANT' },
    } as never)
    expect(actor.actorType).toBe('PARTICIPANT')
    expect(actor.actorId).toBe('p1')
    expect(actor.actorRole).toBe('PARTICIPANT')
  })

  it('falls back to the email alone when a name is missing', () => {
    const actor = actorFromSession({
      user: { id: 'u1', name: '', email: 'nameless@lyante.art', role: 'STAFF' },
    } as never)
    expect(actor.actorLabel).toBe('nameless@lyante.art')
  })

  it('never produces an empty label', () => {
    const actor = actorFromSession({ user: { id: 'u1', role: 'STAFF' } } as never)
    expect(actor.actorLabel.length).toBeGreaterThan(0)
  })
})

describe('SYSTEM_ACTOR', () => {
  it('is attributable to no person', () => {
    expect(SYSTEM_ACTOR).toEqual({
      actorType: 'SYSTEM',
      actorId: null,
      actorLabel: 'system',
      actorRole: null,
    })
  })
})

describe('recordTicketActivity', () => {
  it('writes through the passed transaction client', async () => {
    const { client, create } = txClient()

    await recordTicketActivity(client as never, {
      eventId: 'e1',
      action: 'SCANNED',
      ticketId: 't1',
      actor: {
        actorType: 'USER',
        actorId: 'u1',
        actorLabel: 'Sita <sita@x.co>',
        actorRole: 'ADMIN',
      },
    })

    expect(create).toHaveBeenCalledOnce()
    expect(create.mock.calls[0][0].data).toMatchObject({
      eventId: 'e1',
      action: 'SCANNED',
      ticketId: 't1',
      actorType: 'USER',
      actorId: 'u1',
      actorLabel: 'Sita <sita@x.co>',
      actorRole: 'ADMIN',
      quantity: 1,
    })
  })

  it('defaults quantity to 1 and carries an explicit quantity through', async () => {
    const { client, create } = txClient()
    await recordTicketActivity(client as never, {
      eventId: 'e1',
      action: 'ISSUED',
      quantity: 50,
      actor: SYSTEM_ACTOR,
    })
    expect(create.mock.calls[0][0].data.quantity).toBe(50)
  })

  it('carries reason, amount, paymentId and meta', async () => {
    const { client, create } = txClient()
    await recordTicketActivity(client as never, {
      eventId: 'e1',
      action: 'REFUNDED',
      paymentId: 'p1',
      amount: 4500,
      reason: 'buyer request',
      meta: { alreadyUsed: 1 },
      actor: SYSTEM_ACTOR,
    })
    expect(create.mock.calls[0][0].data).toMatchObject({
      paymentId: 'p1',
      amount: 4500,
      reason: 'buyer request',
      meta: { alreadyUsed: 1 },
    })
  })

  it('omits a null ticketId rather than inventing one', async () => {
    const { client, create } = txClient()
    await recordTicketActivity(client as never, {
      eventId: 'e1',
      action: 'ISSUED',
      quantity: 3,
      actor: SYSTEM_ACTOR,
    })
    expect(create.mock.calls[0][0].data.ticketId).toBeUndefined()
  })
})
