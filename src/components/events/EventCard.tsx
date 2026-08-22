import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Calendar, Ticket } from 'lucide-react'
import { SALE_BADGE_LABEL, EVENT_TYPE_LABEL, type EventSaleBadge } from '@/lib/events'
import { mediaUrl } from '@/lib/media'

export type EventCardBucket = 'upcoming' | 'past' | 'completed'

/**
 * Everything a card needs, pre-computed on the server and JSON-serializable so it
 * can cross into the client `EventsBrowser`. Availability is resolved once via
 * `computeEventAvailability()` (see ARCHITECTURE §15.5) rather than re-derived here.
 */
export interface EventCardData {
  id: string
  title: string
  image: string
  artistImage: string
  venue?: string
  /** ISO string — never a Date, which would not survive the server/client boundary. */
  date: string
  eventType?: string
  badges: EventSaleBadge[]
  bucket: EventCardBucket
  isPurchasable: boolean
  soldOut: boolean
}

export function formatEventDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Why an upcoming event can't be bought. Only ever shown for the `upcoming`
 * bucket — a finished event needs no purchase affordance at all, so past and
 * completed cards render no action slot rather than a disabled-looking one.
 */
export function cardStatusLabel(event: Pick<EventCardData, 'soldOut'>): string {
  return event.soldOut ? 'Sold Out' : 'Sales Closed'
}

export const BUY_BUTTON_CLASS =
  'relative z-10 flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-gold px-4 font-bebas text-base uppercase tracking-[0.1em] text-lyante-bg transition-colors hover:bg-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-lyante-bg'

/** Same height as the buy button so grid rows stay aligned when an event can't be bought. */
const STATUS_BAR_CLASS =
  'flex min-h-11 w-full items-center justify-center rounded-md bg-lyante-surface-mid px-4 font-bebas text-base uppercase tracking-[0.1em] text-ash'

function badgeClasses(b: EventSaleBadge) {
  if (b === 'SOLD_OUT') return 'bg-coal/85 text-ivory'
  if (b === 'EARLY_BIRD') return 'bg-gold text-lyante-bg'
  return 'bg-lyante-bg/85 text-gold border border-gold/50'
}

const BADGE_BASE = 'px-2 py-0.5 text-[10px] font-bebas tracking-[0.15em] uppercase rounded-sm'

function StatusBadges({ event }: { event: EventCardData }) {
  if (event.bucket === 'completed') {
    return (
      <span className={`${BADGE_BASE} bg-lyante-bg/85 text-gold border border-gold/50`}>
        Completed
      </span>
    )
  }
  if (event.bucket === 'past') {
    return <span className={`${BADGE_BASE} bg-coal/85 text-ivory`}>Ended</span>
  }
  return (
    <>
      {event.eventType && (
        <span className={`${BADGE_BASE} bg-lyante-bg/85 text-ivory`}>
          {EVENT_TYPE_LABEL[event.eventType] ?? event.eventType}
        </span>
      )}
      {event.badges.slice(0, 2).map((b) => (
        <span key={b} className={`${BADGE_BASE} ${badgeClasses(b)}`}>
          {SALE_BADGE_LABEL[b]}
        </span>
      ))}
    </>
  )
}

export function EventCard({ event }: { event: EventCardData }) {
  const dateLabel = formatEventDate(event.date)

  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-coal/40 bg-lyante-surface transition-colors group-hover:border-gold/50">
        {event.image ? (
          <Image
            alt={event.title}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            src={mediaUrl(event.image, { width: 800 }) ?? ''}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-bebas text-4xl tracking-widest text-coal">
            LYANTE
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-lyante-bg/70 via-transparent to-transparent" />

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <StatusBadges event={event} />
        </div>

        {event.artistImage && (
          <div className="absolute bottom-3 left-3 h-9 w-9 overflow-hidden rounded-full border border-gold/40">
            <Image alt="" className="object-cover" src={mediaUrl(event.artistImage, { width: 72 }) ?? ''} fill sizes="36px" unoptimized />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-1 flex-col">
        {/* The overlay pseudo-element makes the whole card clickable through this
            single link, so the card needs no nested anchors. */}
        <h3 className="font-bebas text-2xl uppercase leading-tight tracking-tight text-ivory transition-colors line-clamp-2 group-hover:text-gold-light md:text-[28px]">
          <Link
            href={`/events/${event.id}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
          >
            {event.title}
          </Link>
        </h3>

        <p className="mt-2 flex items-center gap-1.5 font-dm-sans text-sm font-medium tracking-wide text-gold">
          <Calendar size={14} className="shrink-0" />
          {dateLabel}
        </p>

        {event.venue && (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] text-ash">
            <MapPin size={13} className="shrink-0" />
            <span className="truncate">{event.venue}</span>
          </p>
        )}

        <div className="mt-auto pt-4">
          {/* Past and completed events get no action slot — there is nothing to
              buy, and a muted bar only reads as a broken button. */}
          {event.bucket === 'upcoming' &&
            (event.isPurchasable ? (
              <Link href={`/booking/${event.id}/checkout`} className={BUY_BUTTON_CLASS}>
                <Ticket size={16} aria-hidden />
                Buy Tickets
              </Link>
            ) : (
              <span className={STATUS_BAR_CLASS}>{cardStatusLabel(event)}</span>
            ))}
          <span
            aria-hidden
            className="mt-2 block text-center text-[12px] tracking-wide text-ash transition-colors group-hover:text-gold-light"
          >
            View Details →
          </span>
        </div>
      </div>
    </article>
  )
}
