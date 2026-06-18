import { EventCard } from '@/components/events/EventCard'
import { eventsResponseSchema } from '@/types/event'

export default async function PublicEventsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/events`, { cache: 'no-store' })

  if (!res.ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Failed to load events.</p>
      </div>
    )
  }

  const raw = await res.json()
  const parsed = eventsResponseSchema.safeParse(raw)

  if (!parsed.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Failed to load events.</p>
      </div>
    )
  }

  const events = parsed.data.filter((e) => e.isOpen)

  if (events.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 text-lg">No upcoming events.</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen  max-w-[1280px] mx-auto px-5 pt-12 pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
        <h1 className="text-[48px] text-gray-900 uppercase leading-none font-bold tracking-tight">
          UPCOMING SHOWS
        </h1>
      </header>

      <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar space-x-12 pb-8">
        {events.map((event) => (
          <EventCard
            key={event.id}
            id={event.id}
            image={event.image ?? ''}
            artistImage={event.artist?.artistImage ?? ''}
            title={event.name}
            description={event.description ?? ''}
            genres={event.genres}
          />
        ))}
      </div>

      <style>
        {`.no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}
      </style>
    </main>
  )
}
