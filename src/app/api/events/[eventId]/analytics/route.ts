import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ eventId: string }> }

const ADMIN_ROLES = ['ADMIN', 'STAFF', 'MANAGER'] as const

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN_ROLES.includes(session.user.role as typeof ADMIN_ROLES[number])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { eventId } = await params

  const [tickets, checkIns] = await Promise.all([
    prisma.ticket.groupBy({
      by: ['status'],
      where: { eventId },
      _count: true,
    }),
    prisma.checkIn.findMany({
      where: { ticket: { eventId } },
      select: { scannedAt: true },
      orderBy: { scannedAt: 'asc' },
    }),
  ])

  const counts = { UNUSED: 0, USED: 0, CANCELLED: 0 }
  for (const group of tickets) {
    counts[group.status as keyof typeof counts] = group._count
  }

  const timelineBuckets: Record<string, number> = {}
  for (const ci of checkIns) {
    const hour = ci.scannedAt.toISOString().slice(0, 13) + ':00'
    timelineBuckets[hour] = (timelineBuckets[hour] ?? 0) + 1
  }

  const timeline = Object.entries(timelineBuckets)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  return NextResponse.json({
    totalTickets: counts.UNUSED + counts.USED + counts.CANCELLED,
    usedTickets: counts.USED,
    unusedTickets: counts.UNUSED,
    cancelledTickets: counts.CANCELLED,
    timeline,
  })
}
