import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { EventForm } from '@/components/events/EventForm'

export default async function NewEventPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/events')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Event</h1>
      <EventForm />
    </div>
  )
}
