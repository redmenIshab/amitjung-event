'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { EVENT_TYPE_LABEL } from '@/lib/events'
import { EventCard, type EventCardBucket, type EventCardData } from './EventCard'
import { FeaturedEvent } from './FeaturedEvent'

type Filter = 'all' | EventCardBucket

const BUCKETS: EventCardBucket[] = ['upcoming', 'past', 'completed']
const FILTER_LABEL: Record<Filter, string> = {
  all: 'All',
  upcoming: 'Upcoming',
  past: 'Past',
  completed: 'Completed',
}

/** Search is frontend-only: every published event is already in memory. */
function matchesQuery(event: EventCardData, query: string): boolean {
  if (!query) return true
  const typeLabel = event.eventType ? (EVENT_TYPE_LABEL[event.eventType] ?? event.eventType) : ''
  return [event.title, event.venue ?? '', typeLabel].join(' ').toLowerCase().includes(query)
}

export function EventsBrowser({ events }: { events: EventCardData[] }) {
  const upcoming = useMemo(() => events.filter((e) => e.bucket === 'upcoming'), [events])

  const [filter, setFilter] = useState<Filter>(upcoming.length > 0 ? 'upcoming' : 'all')
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()

  const searched = useMemo(
    () => events.filter((e) => matchesQuery(e, normalizedQuery)),
    [events, normalizedQuery],
  )

  // Counts reflect the active query, so a chip always shows what it would render.
  const counts = useMemo(() => {
    const byBucket = { all: searched.length } as Record<Filter, number>
    for (const b of BUCKETS) byBucket[b] = searched.filter((e) => e.bucket === b).length
    return byBucket
  }, [searched])

  // Chips only earn their place when there is more than one bucket to switch between.
  const nonEmptyBuckets = BUCKETS.filter((b) => events.some((e) => e.bucket === b))
  const showChips = nonEmptyBuckets.length >= 2
  const showSearch = events.length >= 2

  const visible = filter === 'all' ? searched : searched.filter((e) => e.bucket === filter)

  // Promoting one event above the results fights an active search, so the
  // featured panel steps aside while the user is looking for something specific.
  const featured =
    !normalizedQuery && (filter === 'all' || filter === 'upcoming') ? upcoming[0] : undefined
  const gridEvents = featured ? visible.filter((e) => e.id !== featured.id) : visible

  return (
    <>
      {(showSearch || showChips) && (
        <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {showChips && (
            <div className="flex flex-wrap gap-2">
              {(['all', ...nonEmptyBuckets] as Filter[]).map((f) => {
                const active = filter === f
                const empty = counts[f] === 0
                return (
                  <button
                    key={f}
                    type="button"
                    disabled={empty}
                    aria-pressed={active}
                    onClick={() => setFilter(f)}
                    className={`rounded-full border px-4 py-1.5 font-bebas text-sm uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light ${
                      active
                        ? 'border-gold bg-gold text-lyante-bg'
                        : 'border-coal/60 text-ash hover:border-gold/60 hover:text-ivory'
                    } ${empty ? 'cursor-not-allowed opacity-40 hover:border-coal/60 hover:text-ash' : ''}`}
                  >
                    {FILTER_LABEL[f]}
                    <span className="ml-1.5 text-[11px] opacity-70">{counts[f]}</span>
                  </button>
                )
              })}
            </div>
          )}

          {showSearch && (
            <div className="relative w-full md:w-72">
              <label htmlFor="event-search" className="sr-only">
                Search events
              </label>
              <Search
                size={16}
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ash"
              />
              <input
                id="event-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events…"
                className="w-full rounded-full border border-coal/60 bg-lyante-surface py-2 pl-9 pr-9 font-dm-sans text-sm text-ivory placeholder:text-ash focus:border-gold/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Clear search field"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ash transition-colors hover:text-ivory"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <p aria-live="polite" className="sr-only">
        {visible.length} events found
      </p>

      {featured && <FeaturedEvent event={featured} />}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="font-dm-sans text-lg text-ash">
            No events match “{query.trim()}”
          </p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="rounded-full border border-gold/50 px-5 py-2 font-bebas text-sm uppercase tracking-[0.12em] text-gold transition-colors hover:border-gold hover:text-gold-light"
          >
            Clear search
          </button>
        </div>
      ) : (
        gridEvents.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
            {gridEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )
      )}
    </>
  )
}
