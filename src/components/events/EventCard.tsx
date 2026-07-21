import Image from 'next/image'
import Link from 'next/link'
import { SALE_BADGE_LABEL, EVENT_TYPE_LABEL, type EventSaleBadge } from '@/lib/events'

interface EventCardProps {
  id: string
  image: string
  artistImage: string
  title: string
  description: string
  genres: string[]
  eventType?: string
  badges?: EventSaleBadge[]
  soldOut?: boolean
}

export function EventCard({
  id,
  image,
  artistImage,
  title,
  description,
  genres = [],
  eventType,
  badges = [],
  soldOut = false,
}: EventCardProps) {
  return (
    <div className="min-w-[280px] md:min-w-[320px] lg:min-w-[380px] snap-start">
      <Link href={`/events/${id}`}>
        <div className="aspect-video w-full bg-gray-100 mb-4 overflow-hidden relative">
          <Image alt={title} className="object-cover" src={image} fill sizes="(max-width: 768px) 280px, 380px" unoptimized />
          {(eventType || badges.length > 0) && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1.5">
              {eventType && (
                <span className="bg-gray-900/85 text-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest">
                  {EVENT_TYPE_LABEL[eventType] ?? eventType}
                </span>
              )}
              {badges.map((b) => (
                <span
                  key={b}
                  className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-white ${
                    b === 'SOLD_OUT' ? 'bg-gray-600' : b === 'EARLY_BIRD' ? 'bg-emerald-600' : 'bg-red-600'
                  }`}
                >
                  {SALE_BADGE_LABEL[b]}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="w-16 h-16 bg-gray-100 mb-4 overflow-hidden relative">
          <Image alt={title} className="object-cover" src={artistImage} fill sizes="64px" unoptimized />
        </div>
        <div className="flex flex-col">
          <h3 className="text-[32px] text-gray-900 font-bold leading-tight uppercase mb-4 tracking-tighter">
            {title}
          </h3>
          <p className="text-gray-500 text-sm mb-4 leading-relaxed">{description}</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {genres.map((genre) => (
              <span
                key={genre}
                className="border border-gray-200 px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-gray-600"
              >
                {genre}
              </span>
            ))}
          </div>
          <div
            className={`w-full border px-6 py-2.5 font-bold text-sm uppercase tracking-wider transition-all text-center ${
              soldOut
                ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                : 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
            }`}
          >
            {soldOut ? 'SOLD OUT' : 'GET TICKETS'}
          </div>
        </div>
      </Link>
    </div>
  )
}
