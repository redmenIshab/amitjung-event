'use client'

import { GENRES, type Genre, type MediaFilter } from './works'

const MEDIA_OPTIONS: { value: MediaFilter; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'photo', label: 'PHOTOS' },
  { value: 'video', label: 'VIDEOS' },
]

export function GalleryHeader({
  media,
  genre,
  onMedia,
  onGenre,
}: {
  media: MediaFilter
  genre: Genre | null
  onMedia: (m: MediaFilter) => void
  onGenre: (g: Genre | null) => void
}) {
  return (
    <div className="mb-10">
      {/* Showreel band */}
      <div className="relative w-full h-64 md:h-96 bg-surface mb-10 rounded-sm overflow-hidden group">
        <video
          src="/video/showreel.mov"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-bg/30 group-hover:bg-bg/10 transition-all duration-300" />
        <div className="absolute bottom-4 left-4">
          <p className="section-label">SHOWREEL</p>
        </div>
      </div>

      <p className="section-label mb-3">OUR WORK</p>
      <h2 className="font-cormorant font-bold text-ivory mb-8" style={{ fontSize: 'var(--t-display)' }}>
        Portfolio
      </h2>

      {/* Media toggle */}
      <div className="flex gap-2 flex-wrap mb-4">
        {MEDIA_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onMedia(opt.value)}
            className={`font-bebas text-sm tracking-widest px-4 py-2 min-h-[44px] border transition-all duration-200 ${
              media === opt.value
                ? 'border-gold bg-gold text-bg'
                : 'border-coal text-ash hover:border-gold hover:text-gold'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Genre chips (single-select; re-click clears) */}
      <div className="flex gap-2 flex-wrap">
        {GENRES.map((g) => (
          <button
            key={g}
            onClick={() => onGenre(genre === g ? null : g)}
            className={`font-dm-mono text-xs tracking-[0.2em] px-3 py-1.5 rounded-full border transition-all duration-200 ${
              genre === g
                ? 'border-gold text-gold bg-gold/10'
                : 'border-coal/60 text-ash hover:border-gold/60 hover:text-gold'
            }`}
          >
            {g.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}
