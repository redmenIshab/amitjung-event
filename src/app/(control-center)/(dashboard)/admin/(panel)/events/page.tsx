import Link from 'next/link'
import { requirePageCapability, hasCapability } from '@/lib/rbac'
import { visibleEventIds } from '@/lib/eventAccess'
import { EventList } from '@/components/events/EventList'
import { buttonVariants } from '@/components/ui/button'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const session = await requirePageCapability('DASHBOARD_VIEW')

  // null = every event (ADMIN/STAFF/MANAGER); an array confines an organizer
  // to their assignments.
  const scope = await visibleEventIds(session)

  // Read directly from the DB (not the cache) so admin always sees the true,
  // current state — including drafts and changes made just now.
  const rows = await prisma.event.findMany({
    where: scope ? { id: { in: scope } } : undefined,
    orderBy: { bookingDeadline: 'asc' },
    include: {
      _count: { select: { tickets: true } },
      artist: { select: { id: true, artistName: true, artistImage: true } },
    },
  })
  const events = rows.map((e) => ({ ...e, date: e.bookingDeadline }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 text-sm">
            {events.length} event(s) {scope ? 'assigned to you' : 'total'}
          </p>
        </div>
        {hasCapability(session.user.role, 'EVENT_WRITE') && (
          <Link href="/admin/events/new" className={buttonVariants()}>
            + New Event
          </Link>
        )}
      </div>
      <EventList events={events as any} />
    </div>
  )
}
