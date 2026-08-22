import { prisma } from '@/lib/prisma'
import { SYSTEM_ACTOR, recordTicketActivity, type ActivityActor } from '@/lib/ticketActivity'

// ── Check-in (mutating) ──────────────────────────────────────────────────────

export type VerifyResult =
  | {
      valid: true
      attendeeName: string | null
      attendeeEmail: string | null
      distributorName: string | null
      category: 'GENERAL' | 'VIP'
      eventName: string
    }
  | { valid: false; reason: 'NOT_FOUND' | 'CANCELLED' }
  | { valid: false; reason: 'ALREADY_USED'; usedAt: Date }
  /** Valid ticket, wrong event for this scanner. Never consumed. */
  | { valid: false; reason: 'WRONG_EVENT'; eventName: string }

export interface VerifyOptions {
  /**
   * Restricts the scanner to these events. `null` or omitted means
   * unrestricted (ADMIN/STAFF). The check runs before the update, so a
   * wrong-event scan can never consume a ticket.
   */
  allowedEventIds?: string[] | null
  /** Who is scanning. Recorded in the activity log; defaults to the system actor. */
  actor?: ActivityActor
}

/**
 * Checks a ticket in.
 *
 * Takes an options object rather than positional arguments: it needs both a
 * scope and an actor, and the actor is what finally makes a check-in
 * attributable (CheckIn records only `scannedAt`).
 *
 * Only a successful check-in is logged. A refusal changes nothing, so recording
 * one would fill the event's log with noise that hides the real actions.
 */
export async function verifyTicket(
  token: string,
  options: VerifyOptions = {},
): Promise<VerifyResult> {
  const { allowedEventIds, actor = SYSTEM_ACTOR } = options

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { token },
      include: {
        event: { select: { name: true } },
        checkIn: { select: { scannedAt: true } },
      },
    })

    if (!ticket) return { valid: false, reason: 'NOT_FOUND' } as const

    // Scope first: refusing after the update would burn the attendee's ticket,
    // and answering CANCELLED/ALREADY_USED here would leak another event's
    // ticket state to a scanner with no business seeing it.
    if (allowedEventIds && !allowedEventIds.includes(ticket.eventId)) {
      return { valid: false, reason: 'WRONG_EVENT', eventName: ticket.event.name } as const
    }

    if (ticket.status === 'CANCELLED') return { valid: false, reason: 'CANCELLED' } as const
    if (ticket.status === 'USED') {
      return {
        valid: false,
        reason: 'ALREADY_USED',
        usedAt: ticket.checkIn!.scannedAt,
      } as const
    }

    await tx.ticket.update({ where: { id: ticket.id }, data: { status: 'USED' } })
    await tx.checkIn.create({ data: { ticketId: ticket.id } })
    // Same transaction as the state change: a check-in that is not attributable
    // is the exact failure the log exists to prevent.
    await recordTicketActivity(tx, {
      eventId: ticket.eventId,
      action: 'SCANNED',
      ticketId: ticket.id,
      actor,
    })

    return {
      valid: true,
      attendeeName: ticket.attendeeName,
      attendeeEmail: ticket.attendeeEmail,
      distributorName: ticket.distributorName,
      category: ticket.category,
      eventName: ticket.event.name,
    } as const
  })
}

// ── Public lookup (read-only, no side effects) ───────────────────────────────

export type TicketLookup =
  | {
      found: true
      ticket: {
        id: string
        category: 'GENERAL' | 'VIP'
        status: 'UNUSED' | 'USED' | 'CANCELLED'
        attendeeName: string | null
        distributorName: string | null
        event: { name: string; venue: string; bookingDeadline: Date; description: string | null }
      }
      checkedInAt: Date | null
    }
  | { found: false }

export async function lookupTicket(token: string): Promise<TicketLookup> {
  const ticket = await prisma.ticket.findUnique({
    where: { token },
    include: {
      event: { select: { name: true, venue: true, bookingDeadline: true, description: true } },
      checkIn: { select: { scannedAt: true } },
    },
  })

  if (!ticket) return { found: false }

  return {
    found: true,
    ticket: {
      id: ticket.id,
      category: ticket.category,
      status: ticket.status,
      attendeeName: ticket.attendeeName,
      distributorName: ticket.distributorName,
      event: ticket.event,
    },
    checkedInAt: ticket.checkIn?.scannedAt ?? null,
  }
}
