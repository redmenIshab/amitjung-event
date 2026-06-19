import { getServerSession } from 'next-auth/next'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TicketTable } from '@/components/tickets/TicketTable'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getCachedEvent } from '@/lib/upstash/services/event-cache'

type Props = { params: Promise<{ eventId: string }> }

export default async function EventDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const { eventId } = await params
  const event = await getCachedEvent(eventId)
  if (!event) notFound()

  const rawTickets = await prisma.ticket.findMany({
    where: { eventId },
    include: { checkIn: true },
    orderBy: { createdAt: 'desc' },
  })

  const used = rawTickets.filter((t) => t.status === 'USED').length
  const unused = rawTickets.filter((t) => t.status === 'UNUSED').length

  const tickets = rawTickets.map((t) => ({
    id: t.id,
    attendeeName: t.attendeeName,
    attendeeEmail: t.attendeeEmail,
    distributorName: t.distributorName,
    category: t.category,
    status: t.status,
    source: t.source,
    createdAt: t.createdAt.toISOString(),
    checkIn: t.checkIn ? { scannedAt: t.checkIn.scannedAt.toISOString() } : null,
  }))

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-3">
            {event.image && (
              <img
                src={event.image}
                alt=""
                className="w-12 h-12 rounded-lg object-cover bg-gray-100 shrink-0"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 truncate">{event.name}</h1>
              <p className="text-gray-500 text-sm">
                {event.venue} · {new Date(event.date).toLocaleString()}
              </p>
            </div>
          </div>
          {event.artist && (
            <div className="flex items-center gap-2 pt-1">
              <img
                src={event.artist.artistImage}
                alt=""
                className="w-7 h-7 rounded-full object-cover bg-gray-100"
              />
              <span className="text-sm text-gray-600">{event.artist.artistName}</span>
            </div>
          )}
        </div>
        <Badge variant={event.isOpen ? 'default' : 'secondary'} className="self-start shrink-0">
          {event.isOpen ? 'Registration Open' : 'Registration Closed'}
        </Badge>
      </div>

      {event.isOpen && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-1">Public registration link:</p>
          <p className="text-xs font-mono bg-gray-100 px-2 py-1 rounded break-all">
            {process.env.NEXT_PUBLIC_APP_URL}/register/{event.id}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm mb-6">
        <span className="text-gray-700">
          <strong>{rawTickets.length}</strong> total
        </span>
        <span className="text-green-600">
          <strong>{used}</strong> checked in
        </span>
        <span className="text-gray-500">
          <strong>{unused}</strong> remaining
        </span>
      </div>

      <Separator className="mb-6" />

      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-lg font-semibold">Tickets</h2>
        {session.user.role === 'ADMIN' && (
          <Link
            href={`/events/${eventId}/tickets/new`}
            className={buttonVariants({ size: 'sm' })}
          >
            + Generate
          </Link>
        )}
      </div>

      <TicketTable tickets={tickets} />
    </div>
  )
}
