import { EventCard } from '@/components/events/EventCard'
import { eventsResponseSchema } from '@/types/event'
import { computeEventAvailability, isPubliclyVisible } from '@/lib/events'

function stateScreen(message: string) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-lyante-bg">
      <p className="text-ash text-lg font-dm-sans">{message}</p>
    </div>
  )
}

export default async function PublicEventsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/events`, { cache: 'no-store' })

  if (!res.ok) return stateScreen('Failed to load events.')

  const raw = await res.json()
  const parsed = eventsResponseSchema.safeParse(raw)
  if (!parsed.success) return stateScreen('Failed to load events.')

  // Only published, not-yet-past events are shown to the public.
  const events = parsed.data.filter((e) =>
    isPubliclyVisible({ status: e.status, bookingDeadline: e.date }),
  )

  if (events.length === 0) return stateScreen('No upcoming events.')

  return (
    <main className="max-w-[1280px] mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-32">
      <header className="mb-12 md:mb-16">
        <p className="section-label tracking-widest mb-3">Lyante Presents</p>
        <h1 className="font-bebas text-ivory text-[64px] md:text-[104px] leading-[0.85] tracking-tight">
          UPCOMING SHOWS
        </h1>
        <div className="mt-6 h-px w-full bg-gradient-to-r from-gold/60 via-coal/40 to-transparent" />
      </header>

      <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-8 md:gap-12 pb-8">
        {events.map((event) => {
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
              key={event.id}
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
        })}
      </div>

      <style>
        {`.no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}
      </style>
    </main>
  )
}
