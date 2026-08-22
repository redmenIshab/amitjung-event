import { EventsBrowser } from '@/components/events/EventsBrowser'
import type { EventCardBucket, EventCardData } from '@/components/events/EventCard'
import { eventsResponseSchema, type EventDTO } from '@/types/event'
import { computeEventAvailability } from '@/lib/events'
import { getCachedEvents } from '@/lib/upstash/services/event-cache'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function stateScreen(message: string) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-lyante-bg">
      <p className="text-ash text-lg font-dm-sans">{message}</p>
    </div>
  )
}

/**
 * Buckets come from `computeEventAvailability().lifecycle` rather than inline date
 * math, so the listing can't drift from the shared availability rules
 * (ARCHITECTURE §15.5). Returns null for anything not publicly listable.
 */
function toCardData(event: EventDTO): EventCardData | null {
  const availability = computeEventAvailability({
    status: event.status,
    isOpen: event.isOpen,
    ticketsAvailable: event.ticketsAvailable,
    bookingDeadline: event.date,
    hasDiscount: event.hasDiscount,
    discountUpto: event.discountUpto,
    soldCount: event.soldCount ?? 0,
  })

  let bucket: EventCardBucket
  if (availability.lifecycle === 'COMPLETED') bucket = 'completed'
  else if (event.status !== 'PUBLISHED') return null
  else if (availability.lifecycle === 'LIVE') bucket = 'upcoming'
  else if (availability.lifecycle === 'ENDED') bucket = 'past'
  else return null

  return {
    id: event.id,
    title: event.name,
    image: event.image ?? '',
    artistImage: event.artist?.artistImage ?? '',
    venue: event.venue,
    date: event.date,
    eventType: event.eventType,
    badges: availability.badges,
    bucket,
    isPurchasable: availability.isPurchasable,
    soldOut: availability.soldOut,
  }
}

export default async function PublicEventsPage() {
  // Read directly from the data layer (no self-fetch over HTTP), so it works in
  // any environment regardless of NEXT_PUBLIC_APP_URL / cold starts.
  // Run in parallel: the cache read and the sold-count aggregate are
  // independent, and awaiting them in sequence added a full round trip to every
  // request for no reason.
  const [events, sold] = await Promise.all([
    getCachedEvents(),
    prisma.ticket.groupBy({
      by: ['eventId'],
      where: { status: { not: 'CANCELLED' } },
      _count: true,
    }),
  ])
  const soldByEvent = new Map(sold.map((s) => [s.eventId, s._count]))
  const withCounts = events.map((e) => ({ ...e, soldCount: soldByEvent.get(e.id) ?? 0 }))
  // Normalize Date → ISO strings (mirrors the API's JSON) before schema parse.
  const parsed = eventsResponseSchema.safeParse(JSON.parse(JSON.stringify(withCounts)))
  if (!parsed.success) return stateScreen('Failed to load events.')

  const cards = parsed.data
    .map(toCardData)
    .filter((c): c is EventCardData => c !== null)
    // Upcoming ascending so the soonest show is featured; everything else is a
    // reverse-chronological archive.
    .sort((a, b) => {
      const at = new Date(a.date).getTime()
      const bt = new Date(b.date).getTime()
      if (a.bucket === 'upcoming' && b.bucket === 'upcoming') return at - bt
      if (a.bucket === 'upcoming') return -1
      if (b.bucket === 'upcoming') return 1
      return bt - at
    })

  if (cards.length === 0) return stateScreen('No events yet.')

  return (
    <main className="max-w-[1280px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-32">
      <header className="mb-12 md:mb-16">
        <p className="section-label tracking-widest mb-3">Lyante Presents</p>
        <h1 className="font-bebas text-ivory text-[64px] md:text-[104px] leading-[0.85] tracking-tight">
          UPCOMING SHOWS
        </h1>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-gold/60 via-coal/40 to-transparent" />
      </header>

      <EventsBrowser events={cards} />
    </main>
  )
}
