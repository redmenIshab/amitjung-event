import Link from 'next/link'
import { requirePageCapability, hasCapability } from '@/lib/rbac'
import { EventList } from '@/components/events/EventList'
import { buttonVariants } from '@/components/ui/button'
import { getCachedEvents } from '@/lib/upstash/services/event-cache'

export default async function EventsPage() {
  const session = await requirePageCapability('DASHBOARD_VIEW')

  const events = await getCachedEvents()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 text-sm">{events.length} event(s) total</p>
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
