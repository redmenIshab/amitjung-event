import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Calendar } from 'lucide-react'
import { SALE_BADGE_LABEL, EVENT_TYPE_LABEL, type EventSaleBadge } from '@/lib/events'

interface EventCardProps {
  id: string
  image: string
  artistImage: string
  title: string
  venue?: string
  date?: string
  description: string
  genres: string[]
  eventType?: string
  badges?: EventSaleBadge[]
  soldOut?: boolean
  /** Past event: not clickable, shown with a gray inactive overlay. */
  inactive?: boolean
}

function badgeClasses(b: EventSaleBadge) {
  if (b === 'SOLD_OUT') return 'bg-coal/80 text-ivory'
  if (b === 'EARLY_BIRD') return 'bg-gold text-lyante-bg'
  return 'bg-lyante-bg/80 text-gold border border-gold/50'
}

export function EventCard({
  id,
  image,
  artistImage,
  title,
  venue,
  date,
  description,
  genres = [],
  eventType,
  badges = [],
  soldOut = false,
  inactive = false,
}: EventCardProps) {
  const dateLabel = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const body = (
    <>
      <div
        className={`aspect-[4/5] w-full bg-lyante-surface mb-5 overflow-hidden relative border transition-colors ${
          inactive ? 'border-coal/40' : 'border-coal/40 group-hover:border-gold/50'
        }`}
      >
        {image ? (
          <Image
            alt={title}
            className={`object-cover transition-transform duration-700 ${
              inactive ? 'grayscale' : 'grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-105'
            }`}
            src={image}
            fill
            sizes="(max-width: 768px) 280px, 400px"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-coal font-bebas text-6xl tracking-widest">
            LYANTE
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-lyante-bg/90 via-transparent to-transparent" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {inactive ? (
            <span className="bg-coal/85 text-ivory px-2.5 py-1 text-[10px] font-bebas tracking-[0.2em] uppercase">
              Ended
            </span>
          ) : (
            <>
              {eventType && (
                <span className="bg-lyante-bg/85 text-ivory px-2.5 py-1 text-[10px] font-bebas tracking-[0.2em] uppercase">
                  {EVENT_TYPE_LABEL[eventType] ?? eventType}
                </span>
              )}
              {badges.map((b) => (
                <span
                  key={b}
                  className={`px-2.5 py-1 text-[10px] font-bebas tracking-[0.2em] uppercase ${badgeClasses(b)}`}
                >
                  {SALE_BADGE_LABEL[b]}
                </span>
              ))}
            </>
          )}
        </div>

        {artistImage && (
          <div className="absolute bottom-3 left-3 w-12 h-12 overflow-hidden border border-gold/40 relative">
            <Image alt="" className="object-cover grayscale" src={artistImage} fill sizes="48px" unoptimized />
          </div>
        )}

        {/* Light gray inactive overlay for past events */}
        {inactive && <div className="absolute inset-0 bg-gray-300/25 pointer-events-none" />}
      </div>

      <div className="flex flex-col">
        <h3
          className={`font-bebas text-[34px] leading-[0.9] tracking-tight uppercase mb-3 transition-colors ${
            inactive ? 'text-ash' : 'text-ivory group-hover:text-gold-light'
          }`}
        >
          {title}
        </h3>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4 text-[13px] text-ash font-dm-sans">
          {dateLabel && (
            <span className="flex items-center gap-1.5">
              <Calendar size={13} className={inactive ? 'text-ash' : 'text-gold'} />
              {dateLabel}
            </span>
          )}
          {venue && (
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className={inactive ? 'text-ash' : 'text-gold'} />
              {venue}
            </span>
          )}
        </div>

        {description && (
          <p className="text-ash/80 text-sm mb-5 leading-relaxed font-dm-sans line-clamp-2">
            {description}
          </p>
        )}

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {genres.map((genre) => (
              <span
                key={genre}
                className="border border-coal/60 px-2.5 py-1 text-[10px] font-bebas uppercase tracking-[0.2em] text-ash"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        <div
          className={`w-full px-6 py-3 font-bebas text-sm uppercase tracking-[0.2em] transition-all text-center ${
            inactive
              ? 'border border-coal/60 text-ash'
              : soldOut
                ? 'border border-coal/60 text-coal cursor-not-allowed'
                : 'bg-gold text-lyante-bg hover:bg-gold-light'
          }`}
        >
          {inactive ? 'Event Ended' : soldOut ? 'Sold Out' : 'Get Tickets'}
        </div>
      </div>
    </>
  )

  const container = 'min-w-[280px] md:min-w-[340px] lg:min-w-[400px] snap-start'

  if (inactive) {
    return (
      <div className={`${container} relative cursor-not-allowed opacity-70`} aria-disabled="true">
        {body}
      </div>
    )
  }

  return (
    <div className={`${container} group`}>
      <Link href={`/events/${id}`} className="block">
        {body}
      </Link>
    </div>
  )
}
