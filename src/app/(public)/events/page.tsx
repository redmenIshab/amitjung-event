import { EventCard } from '@/components/events/EventCard'
import { eventsResponseSchema, type EventDTO } from '@/types/event'
import { computeEventAvailability } from '@/lib/events'

function stateScreen(message: string) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-lyante-bg">
      <p className="text-ash text-lg font-dm-sans">{message}</p>
    </div>
  )
}

function UpcomingCard({ event }: { event: EventDTO }) {
  const availability = computeEventAvailability({
    status: event.status,
    isOpen: event.isOpen,
    ticketsAvailable: event.ticketsAvailable,
    bookingDeadline: event.date,
    hasDiscount: event.hasDiscount,
    discountUpto: event.discountUpto,
    soldCount: event.soldCount ?? 0,
  })
  return (
    <EventCard
      id={event.id}
      image={event.image ?? ''}
      artistImage={event.artist?.artistImage ?? ''}
      title={event.name}
      venue={event.venue}
      date={event.date}
      description={event.description ?? ''}
      genres={event.genres}
      eventType={event.eventType}
      badges={availability.badges}
      soldOut={availability.soldOut}
    />
  )
}

function PastCard({ event }: { event: EventDTO }) {
  return (
    <EventCard
      id={event.id}
      image={event.image ?? ''}
      artistImage={event.artist?.artistImage ?? ''}
      title={event.name}
      venue={event.venue}
      date={event.date}
      description={event.description ?? ''}
      genres={event.genres}
      eventType={event.eventType}
      inactive
    />
  )
}

const SCROLLER = 'flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-8 md:gap-12 pb-8'

export default async function PublicEventsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/events`, { cache: 'no-store' })

  if (!res.ok) return stateScreen('Failed to load events.')

  const raw = await res.json()
  const parsed = eventsResponseSchema.safeParse(raw)
  if (!parsed.success) return stateScreen('Failed to load events.')

  // Public sees only PUBLISHED events, split into upcoming (on/before the
  // booking deadline) and past (deadline elapsed). Past events render inactive.
  const now = Date.now()
  const published = parsed.data.filter((e) => e.status === 'PUBLISHED')
  const upcoming = published.filter((e) => new Date(e.date).getTime() >= now)
  const past = published
    .filter((e) => new Date(e.date).getTime() < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  if (upcoming.length === 0 && past.length === 0) return stateScreen('No events yet.')

  return (
    <main className="max-w-[1280px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-32">
      {upcoming.length > 0 && (
        <section className="mb-20 md:mb-28">
          <header className="mb-12 md:mb-16">
            <p className="section-label tracking-widest mb-3">Lyante Presents</p>
            <h1 className="font-bebas text-ivory text-[64px] md:text-[104px] leading-[0.85] tracking-tight">
              UPCOMING SHOWS
            </h1>
            <div className="mt-6 h-px w-full bg-gradient-to-r from-gold/60 via-coal/40 to-transparent" />
          </header>
          <div className={SCROLLER}>
            {upcoming.map((event) => (
              <UpcomingCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <header className="mb-10 md:mb-14">
            <p className="section-label tracking-widest mb-3">Archive</p>
            <h2 className="font-bebas text-ash text-[44px] md:text-[72px] leading-[0.85] tracking-tight">
              PAST EVENTS
            </h2>
            <div className="mt-6 h-px w-full bg-gradient-to-r from-coal/50 to-transparent" />
          </header>
          <div className={SCROLLER}>
            {past.map((event) => (
              <PastCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      <style>
        {`.no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}
      </style>
    </main>
  )
}
