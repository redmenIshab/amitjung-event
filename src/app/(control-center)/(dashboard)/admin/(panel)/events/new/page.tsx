import { requirePageCapability } from '@/lib/rbac'
import { EventForm } from '@/components/events/EventForm'

export default async function NewEventPage() {
  await requirePageCapability('EVENT_WRITE')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Event</h1>
      <EventForm />
    </div>
  )
}
