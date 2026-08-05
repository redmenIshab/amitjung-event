import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Calendar, Ticket } from 'lucide-react'
import { SALE_BADGE_LABEL, EVENT_TYPE_LABEL } from '@/lib/events'
import {
  BUY_BUTTON_CLASS,
  cardStatusLabel,
  formatEventDate,
  type EventCardData,
} from './EventCard'

const BADGE_BASE = 'px-2 py-0.5 text-[10px] font-bebas tracking-[0.15em] uppercase rounded-sm'

/**
 * The soonest upcoming event, promoted to a full-width panel so a single show
 * fills the viewport instead of sitting in a one-third grid cell.
 */
export function FeaturedEvent({ event }: { event: EventCardData }) {
  return (
    <section className="relative mb-14 flex flex-col overflow-hidden rounded-xl border border-gold/25 bg-lyante-surface md:min-h-[420px] md:flex-row">
      <div className="relative aspect-[16/10] w-full md:aspect-auto md:w-[55%]">
        {event.image ? (
          <Image
            alt={event.title}
            className="object-cover"
            src={event.image}
            fill
            sizes="(max-width: 768px) 100vw, 55vw"
            priority
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-bebas text-6xl tracking-widest text-coal">
            LYANTE
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-lyante-bg/80 via-lyante-bg/10 to-transparent md:bg-gradient-to-r md:from-transparent md:via-transparent md:to-lyante-surface" />
      </div>

      <div className="flex flex-1 flex-col justify-center gap-4 p-6 md:p-10">
        <p className="section-label tracking-widest">Next Show</p>

        <h2
          className="font-bebas uppercase leading-[0.9] tracking-tight text-ivory"
          style={{ fontSize: 'clamp(40px, 5vw, 72px)' }}
        >
          {event.title}
        </h2>

        {(event.eventType || event.badges.length > 0) && (
          <div className="flex flex-wrap gap-1.5">
            {event.eventType && (
              <span className={`${BADGE_BASE} bg-lyante-bg/85 text-ivory`}>
                {EVENT_TYPE_LABEL[event.eventType] ?? event.eventType}
              </span>
            )}
            {event.badges.slice(0, 3).map((b) => (
              <span key={b} className={`${BADGE_BASE} border border-gold/50 bg-lyante-bg/85 text-gold`}>
                {SALE_BADGE_LABEL[b]}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <p className="flex items-center gap-2 font-dm-sans text-base font-medium tracking-wide text-gold">
            <Calendar size={16} className="shrink-0" />
            {formatEventDate(event.date)}
          </p>
          {event.venue && (
            <p className="flex items-center gap-2 text-sm text-ash">
              <MapPin size={15} className="shrink-0" />
              {event.venue}
            </p>
          )}
        </div>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          {event.isPurchasable ? (
            <Link
              href={`/booking/${event.id}/checkout`}
              className={`${BUY_BUTTON_CLASS} sm:w-auto sm:min-h-14 sm:px-8 sm:text-lg`}
            >
              <Ticket size={18} aria-hidden />
              Buy Tickets
            </Link>
          ) : (
            <span className="flex min-h-11 items-center justify-center rounded-md bg-lyante-surface-mid px-6 font-bebas text-base uppercase tracking-[0.1em] text-ash sm:min-h-14 sm:text-lg">
              {cardStatusLabel(event)}
            </span>
          )}

          <Link
            href={`/events/${event.id}`}
            className="flex min-h-11 items-center justify-center rounded-md border border-gold/50 px-6 font-bebas text-base uppercase tracking-[0.1em] text-gold transition-colors hover:border-gold hover:text-gold-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light focus-visible:ring-offset-2 focus-visible:ring-offset-lyante-bg sm:min-h-14 sm:text-lg"
          >
            View Details
          </Link>
        </div>
      </div>
    </section>
  )
}
