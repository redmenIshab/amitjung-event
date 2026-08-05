import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

/**
 * The signed-in account's own basic details.
 *
 * Reads whichever of the two identity tables the session points at
 * (ARCHITECTURE §5): PARTICIPANT sessions resolve against `Participant`,
 * everything else against `User`. Scoped to the caller's own id — there is no
 * way to ask for someone else's record.
 */
export async function GET(request: Request) {
  const gate = await requireSession(request)
  if (gate instanceof NextResponse) return gate

  const { id, role } = gate.session.user

  if (role === 'PARTICIPANT') {
    const participant = await prisma.participant.findUnique({
      where: { id },
      select: { name: true, email: true, image: true, createdAt: true, deletedAt: true },
    })
    if (!participant || participant.deletedAt) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const ticketCount = await prisma.ticket.count({
      where: { booking: { participantId: id } },
    })

    return NextResponse.json({
      name: participant.name,
      email: participant.email,
      image: participant.image,
      accountType: 'Ticket holder',
      signInMethod: 'Google',
      memberSince: participant.createdAt.toISOString(),
      ticketCount,
    })
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, email: true, role: true, createdAt: true, deletedAt: true },
  })
  if (!user || user.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    name: user.name,
    email: user.email,
    image: null,
    // USER is the plain non-staff account; anything else is a Control Center role.
    accountType: user.role === 'USER' ? 'Member' : `Staff · ${user.role}`,
    signInMethod: 'Email & password',
    memberSince: user.createdAt.toISOString(),
    ticketCount: null,
  })
}
