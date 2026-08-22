import type { Prisma } from '@prisma/client'
import type { Session } from 'next-auth'

/**
 * The ticket activity log — who did what to a ticket.
 *
 * Every security-critical ticket action funnels through `recordTicketActivity`.
 * It takes a **transaction client** rather than the Prisma singleton so the log
 * entry and the state change it describes commit or roll back together: a scan
 * that succeeds without a log entry is precisely the failure this exists to
 * prevent.
 *
 * The log is append-only by construction. Nothing in this module — or anywhere
 * else in the app — updates or deletes an entry.
 */

/** Any Prisma client that can write the table: the singleton or a `$transaction` client. */
export type ActivityClient = Pick<Prisma.TransactionClient, 'ticketActivity'>

export type TicketAction =
  | 'ISSUED'
  | 'PURCHASED'
  | 'SELF_REGISTERED'
  | 'SCANNED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DELETED'

/**
 * Who performed the action, snapshotted at write time.
 *
 * Deliberately plain data rather than a relation: the log must still name the
 * actor after the account is renamed, deactivated or removed.
 */
export interface ActivityActor {
  actorType: 'USER' | 'PARTICIPANT' | 'SYSTEM'
  actorId: string | null
  actorLabel: string
  actorRole: string | null
}

/** Unattended paths — the booking queue, cleanup jobs. Never attributed to a person. */
export const SYSTEM_ACTOR: ActivityActor = {
  actorType: 'SYSTEM',
  actorId: null,
  actorLabel: 'system',
  actorRole: null,
}

export interface ActivityEntry {
  eventId: string
  action: TicketAction
  actor: ActivityActor
  /** The exact ticket, for state changes. Omitted on aggregate creation rows. */
  ticketId?: string
  paymentId?: string
  /** Tickets covered by this entry. Defaults to 1. */
  quantity?: number
  reason?: string
  amount?: number
  meta?: Prisma.InputJsonValue
}

/**
 * Resolves the acting identity from a session.
 *
 * `PARTICIPANT` is the buyer table; every other role is a staff `User`
 * (ARCHITECTURE §5). The label always has content — an entry that cannot say
 * who acted is worse than one naming only an id.
 */
export function actorFromSession(session: Session): ActivityActor {
  const { id, name, email, role } = session.user
  const label = name && email ? `${name} <${email}>` : (name || email || id || 'unknown')

  return {
    actorType: role === 'PARTICIPANT' ? 'PARTICIPANT' : 'USER',
    actorId: id ?? null,
    actorLabel: label,
    actorRole: role ?? null,
  }
}

/**
 * Appends one entry.
 *
 * @param tx MUST be the same transaction client as the state change being
 *   recorded, so the two cannot diverge.
 */
export async function recordTicketActivity(
  tx: ActivityClient,
  entry: ActivityEntry,
): Promise<void> {
  const { actor, quantity, ...rest } = entry

  await tx.ticketActivity.create({
    data: {
      ...rest,
      quantity: quantity ?? 1,
      actorType: actor.actorType,
      actorId: actor.actorId,
      actorLabel: actor.actorLabel,
      actorRole: actor.actorRole,
    },
  })
}
