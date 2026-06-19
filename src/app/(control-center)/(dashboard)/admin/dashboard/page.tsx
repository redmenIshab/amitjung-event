import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { CheckInChart } from '@/components/dashboard/CheckInChart'
import { Separator } from '@/components/ui/separator'
import { getCachedUpcomingEvents } from '@/lib/upstash/services/event-cache'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [ticketCounts, checkIns, upcomingEvents] = await Promise.all([
    prisma.ticket.groupBy({ by: ['status'], _count: true }),
    prisma.checkIn.findMany({
      select: { scannedAt: true },
      orderBy: { scannedAt: 'asc' },
    }),
    getCachedUpcomingEvents(),
  ])

  const counts = { UNUSED: 0, USED: 0, CANCELLED: 0 }
  for (const g of ticketCounts) counts[g.status as keyof typeof counts] = g._count

  const timelineBuckets: Record<string, number> = {}
  for (const ci of checkIns) {
    const hour = ci.scannedAt.toISOString().slice(0, 13) + ':00'
    timelineBuckets[hour] = (timelineBuckets[hour] ?? 0) + 1
  }
  const timeline = Object.entries(timelineBuckets)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">All-time stats across all events</p>
      </div>

      <StatsCards
        totalTickets={counts.UNUSED + counts.USED + counts.CANCELLED}
        usedTickets={counts.USED}
        unusedTickets={counts.UNUSED}
      />

      <CheckInChart data={timeline} />

      <Separator />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-gray-400 text-sm">No upcoming events.</p>
        ) : (
          <div className="space-y-2">
            {upcomingEvents.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="flex items-center justify-between gap-3 p-3 bg-white border rounded-lg hover:border-gray-400 transition-colors"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{event.name}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {event.venue} · {new Date(event.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm text-gray-400 shrink-0">
                  {event._count.tickets} tickets
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
