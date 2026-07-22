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
  description?: string
  genres?: string[]
  eventType?: string
  badges?: EventSaleBadge[]
  soldOut?: boolean
  /** Past event: not clickable, shown with a gray inactive overlay. */
  inactive?: boolean
}

function badgeClasses(b: EventSaleBadge) {
  if (b === 'SOLD_OUT') return 'bg-coal/85 text-ivory'
  if (b === 'EARLY_BIRD') return 'bg-gold text-lyante-bg'
  return 'bg-lyante-bg/85 text-gold border border-gold/50'
}

export function EventCard({
  id,
  image,
  artistImage,
  title,
  venue,
  date,
  eventType,
  badges = [],
  inactive = false,
}: EventCardProps) {
  const dateLabel = date
    ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  const body = (
    <>
      <div
        className={`aspect-[3/2] w-full bg-lyante-surface overflow-hidden relative rounded-lg border transition-colors ${
          inactive ? 'border-coal/40' : 'border-coal/40 group-hover:border-gold/50'
        }`}
      >
        {image ? (
          <Image
            alt={title}
            className={`object-cover transition-transform duration-500 ${
              inactive ? 'grayscale' : 'group-hover:scale-105'
            }`}
            src={image}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-coal font-bebas text-3xl tracking-widest">
            LYANTE
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-lyante-bg/70 via-transparent to-transparent" />

        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {inactive ? (
            <span className="bg-coal/85 text-ivory px-1.5 py-0.5 text-[9px] font-bebas tracking-[0.15em] uppercase">
              Ended
            </span>
          ) : (
            <>
              {eventType && (
                <span className="bg-lyante-bg/85 text-ivory px-1.5 py-0.5 text-[9px] font-bebas tracking-[0.15em] uppercase">
                  {EVENT_TYPE_LABEL[eventType] ?? eventType}
                </span>
              )}
              {badges.slice(0, 2).map((b) => (
                <span
                  key={b}
                  className={`px-1.5 py-0.5 text-[9px] font-bebas tracking-[0.15em] uppercase ${badgeClasses(b)}`}
                >
                  {SALE_BADGE_LABEL[b]}
                </span>
              ))}
            </>
          )}
        </div>

        {artistImage && (
          <div className="absolute bottom-2 left-2 w-7 h-7 overflow-hidden rounded-full border border-gold/40 relative">
            <Image alt="" className="object-cover grayscale" src={artistImage} fill sizes="28px" unoptimized />
          </div>
        )}

        {inactive && <div className="absolute inset-0 bg-gray-300/20 pointer-events-none" />}
      </div>

      <div className="mt-2.5">
        <h3
          className={`font-bebas text-base md:text-lg leading-tight tracking-tight uppercase line-clamp-1 transition-colors ${
            inactive ? 'text-ash' : 'text-ivory group-hover:text-gold-light'
          }`}
        >
          {title}
        </h3>
        <div className="flex items-center gap-2.5 mt-1 text-[11px] text-ash min-w-0">
          {dateLabel && (
            <span className="flex items-center gap-1 shrink-0">
              <Calendar size={11} className={inactive ? 'text-ash' : 'text-gold'} />
              {dateLabel}
            </span>
          )}
          {venue && (
            <span className="flex items-center gap-1 min-w-0">
              <MapPin size={11} className={`shrink-0 ${inactive ? 'text-ash' : 'text-gold'}`} />
              <span className="truncate">{venue}</span>
            </span>
          )}
        </div>
      </div>
    </>
  )

  if (inactive) {
    return (
      <div className="w-full relative cursor-not-allowed opacity-70" aria-disabled="true">
        {body}
      </div>
    )
  }

  return (
    <div className="w-full group">
      <Link href={`/events/${id}`} className="block">
        {body}
      </Link>
    </div>
  )
}
