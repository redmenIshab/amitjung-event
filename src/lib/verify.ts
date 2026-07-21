import { prisma } from '@/lib/prisma'

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

export async function verifyTicket(token: string): Promise<VerifyResult> {
  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { token },
      include: {
        event: { select: { name: true } },
        checkIn: { select: { scannedAt: true } },
      },
    })

    if (!ticket) return { valid: false, reason: 'NOT_FOUND' } as const
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
