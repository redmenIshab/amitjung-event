import { redirect } from 'next/navigation'
import { requirePageCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { TicketCreationTabs } from '@/components/tickets/TicketCreationTabs'

type Props = { params: Promise<{ eventId: string }> }

export default async function NewTicketPage({ params }: Props) {
  await requirePageCapability('TICKET_MANAGE')

  const { eventId } = await params
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { name: true, venue: true, bookingDeadline: true },
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
        eventDate={event.bookingDeadline.toISOString()}
        emailEnabled={process.env.ENABLE_EMAIL === 'true'}
      />
    </div>
  )
}
