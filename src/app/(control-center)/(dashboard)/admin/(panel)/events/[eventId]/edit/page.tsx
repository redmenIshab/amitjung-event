import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requirePageCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { EditEventForm } from '@/components/events/EditEventForm'

type Props = { params: Promise<{ eventId: string }> }

export default async function EditEventPage({ params }: Props) {
  await requirePageCapability('EVENT_WRITE')
  const { eventId } = await params

  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) notFound()

  return (
    <div>
      <Link
        href={`/admin/events/${eventId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={14} />
        Back to event
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Event</h1>
      <EditEventForm
        event={{
          id: event.id,
          name: event.name,
          venue: event.venue,
          bookingDeadline: event.bookingDeadline.toISOString(),
          capacity: event.capacity,
          ticketsAvailable: event.ticketsAvailable,
          status: event.status,
          eventType: event.eventType,
          baseTicketPrice: event.baseTicketPrice,
          commissionPercentage: event.commissionPercentage,
          hasDiscount: event.hasDiscount,
          discountPercentage: event.discountPercentage,
          discountUpto: event.discountUpto ? event.discountUpto.toISOString() : null,
          description: event.description,
          isOpen: event.isOpen,
          image: event.image,
          genres: event.genres,
          artistId: event.artistId,
        }}
      />
    </div>
  )
}
