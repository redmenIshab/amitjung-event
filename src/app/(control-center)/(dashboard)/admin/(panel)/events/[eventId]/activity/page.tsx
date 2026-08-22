import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireEventPageCapability } from '@/lib/eventAccess'
import { prisma } from '@/lib/prisma'
import { ActivityFeed, type ActivityRow } from '@/components/events/ActivityFeed'

type Props = { params: Promise<{ eventId: string }> }

export const dynamic = 'force-dynamic'

/** Newest first, capped: the feed is for review, not archaeology. */
const LIMIT = 250

export default async function EventActivityPage({ params }: Props) {
  const { eventId } = await params
  // EVENT_READ, so an organizer sees their own event's log and no other's.
  await requireEventPageCapability('EVENT_READ', eventId)

  const [event, rows] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { name: true } }),
    prisma.ticketActivity.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
      take: LIMIT,
    }),
  ])
  if (!event) notFound()

  const feed: ActivityRow[] = rows.map((r) => ({
    id: r.id,
    action: r.action,
    ticketId: r.ticketId,
    paymentId: r.paymentId,
    quantity: r.quantity,
    actorLabel: r.actorLabel,
    actorRole: r.actorRole,
    reason: r.reason,
    amount: r.amount,
    meta: (r.meta as Record<string, unknown> | null) ?? null,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div>
      <Link
        href={`/admin/events/${eventId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={14} />
        Back to event
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activity</h1>
        <p className="text-gray-500 text-sm mt-1">
          Every recorded action on {event.name}&apos;s tickets. This log is append-only —
          entries cannot be edited or removed.
          {rows.length === LIMIT && ` Showing the most recent ${LIMIT}.`}
        </p>
      </div>
      <ActivityFeed rows={feed} />
    </div>
  )
}
