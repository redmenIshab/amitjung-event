import { notFound } from 'next/navigation'
import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { hasCapability } from '@/lib/rbac'
import { requireEventPageCapability } from '@/lib/eventAccess'
import { prisma } from '@/lib/prisma'
import { TicketTable } from '@/components/tickets/TicketTable'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckInChart } from '@/components/dashboard/CheckInChart'
import { EventManageActions } from '@/components/events/EventManageActions'
import { OrganizerTeamPanel } from '@/components/events/OrganizerTeamPanel'
import { toStaffUserDto } from '@/lib/users'
import {
  computeEventAvailability,
  SALE_BADGE_LABEL,
  EVENT_TYPE_LABEL,
} from '@/lib/events'

type Props = { params: Promise<{ eventId: string }> }

export const dynamic = 'force-dynamic'

export default async function EventDetailPage({ params }: Props) {
  const { eventId } = await params
  // Scoped: an organizer reaches only the events they are assigned to.
  const session = await requireEventPageCapability('EVENT_READ', eventId)
  // Read directly from the DB (not the cache) so admin sees the true state.
  const eventRow = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      artist: {
        include: {
          musics: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'asc' },
            select: { id: true, musicTitle: true },
          },
        },
      },
    },
  })
  if (!eventRow) notFound()
  const event = { ...eventRow, date: eventRow.bookingDeadline }

  const rawTickets = await prisma.ticket.findMany({
    where: { eventId },
    include: { checkIn: true },
    orderBy: { createdAt: 'desc' },
  })

  // Only the admin who can change the team needs to load it.
  const canManageTeam = hasCapability(session.user.role, 'USER_MANAGE')
  const teamRows = canManageTeam
    ? await prisma.eventAssignment.findMany({
        where: { eventId },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              deletedAt: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      })
    : []

  const used = rawTickets.filter((t) => t.status === 'USED').length
  const unused = rawTickets.filter((t) => t.status === 'UNUSED').length
  const cancelled = rawTickets.filter((t) => t.status === 'CANCELLED').length
  const sold = rawTickets.length - cancelled

  const availability = computeEventAvailability({
    status: event.status,
    isOpen: event.isOpen,
    ticketsAvailable: event.ticketsAvailable,
    bookingDeadline: event.date,
    hasDiscount: event.hasDiscount,
    discountUpto: event.discountUpto,
    soldCount: sold,
  })

  const timelineBuckets: Record<string, number> = {}
  for (const t of rawTickets) {
    if (t.checkIn) {
      const hour = t.checkIn.scannedAt.toISOString().slice(0, 13) + ':00'
      timelineBuckets[hour] = (timelineBuckets[hour] ?? 0) + 1
    }
  }
  const timeline = Object.entries(timelineBuckets)
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

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

      {/* Status / type / sale-state */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge
          variant={
            event.status === 'PUBLISHED'
              ? 'default'
              : event.status === 'CANCELLED'
                ? 'destructive'
                : 'secondary'
          }
        >
          {event.status}
        </Badge>
        <Badge variant="outline">{EVENT_TYPE_LABEL[event.eventType] ?? event.eventType}</Badge>
        {availability.badges.map((b) => (
          <Badge key={b} variant="outline">
            {SALE_BADGE_LABEL[b]}
          </Badge>
        ))}
      </div>

      {/* Management actions (PUT updates) */}
      {hasCapability(session.user.role, 'EVENT_WRITE') && (
        <div className="mb-6">
          <EventManageActions
            eventId={event.id}
            status={event.status}
            isOpen={event.isOpen}
            date={new Date(event.date).toISOString()}
          />
        </div>
      )}

      {/* At-a-glance counts. The full analytics view lives on its own route. */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-medium text-gray-500">At a glance</h2>
        <Link
          href={`/admin/events/${eventId}/analytics`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border border-black/10 rounded-md px-2.5 py-1.5 transition-colors"
        >
          <BarChart3 size={14} />
          Full analytics
        </Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Sold', value: sold, cls: 'text-gray-900' },
          { label: 'Remaining', value: availability.remaining, cls: 'text-gray-900' },
          { label: 'For sale', value: event.ticketsAvailable, cls: 'text-gray-500' },
          { label: 'Capacity', value: event.capacity, cls: 'text-gray-500' },
          { label: 'Checked in', value: used, cls: 'text-green-600' },
          { label: 'Cancelled', value: cancelled, cls: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-white p-3">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-2">Check-ins over time</h2>
        <CheckInChart data={timeline} />
      </div>

      <p className="text-xs text-gray-400 mb-6">
        {unused} issued tickets not yet checked in.
      </p>

      <Separator className="mb-6" />

      {canManageTeam && (
        <div className="mb-6">
          <OrganizerTeamPanel
            eventId={eventId}
            initialMembers={teamRows.map((t) => toStaffUserDto(t.user))}
          />
        </div>
      )}

      <div className="flex items-center justify-between mb-4 gap-2">
        <h2 className="text-lg font-semibold">Tickets</h2>
        {hasCapability(session.user.role, 'TICKET_MANAGE') && (
          <Link
            href={`/admin/events/${eventId}/tickets/new`}
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
