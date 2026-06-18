import Image from 'next/image'
import Link from 'next/link'

interface EventCardProps {
  id: string
  image: string
  artistImage: string
  title: string
  description: string
  genres: string[]
}

export function EventCard({ id, image, artistImage, title, description, genres = [] }: EventCardProps) {
  return (
    <div className="min-w-[280px] md:min-w-[320px] lg:min-w-[380px] snap-start">
      <Link href={`/events/${id}`}>
        <div className="aspect-video w-full bg-gray-100 mb-4 overflow-hidden relative">
          <Image alt={title} className="object-cover" src={image} fill sizes="(max-width: 768px) 280px, 380px" unoptimized />
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
          <div className="w-full border border-gray-900 text-gray-900 px-6 py-2.5 font-bold text-sm uppercase tracking-wider hover:bg-gray-900 hover:text-white transition-all text-center">
            GET TICKETS
          </div>
        </div>
      </Link>
    </div>
  )
}
