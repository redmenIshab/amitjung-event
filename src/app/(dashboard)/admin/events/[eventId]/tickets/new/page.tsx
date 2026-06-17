import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TicketCreationTabs } from '@/components/tickets/TicketCreationTabs'

type Props = { params: Promise<{ eventId: string }> }

export default async function NewTicketPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/events')

  const { eventId } = await params
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true, venue: true, date: true },
  })
  if (!event) redirect('/events')

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Generate Tickets</h1>
      <p className="text-gray-500 text-sm mb-6">{event.name}</p>
      <TicketCreationTabs
        eventId={eventId}
        eventName={event.name}
        eventVenue={event.venue}
        eventDate={event.date.toISOString()}
        emailEnabled={process.env.ENABLE_EMAIL === 'true'}
      />
    </div>
  )
}
