'use client'

import { useState } from 'react'
import { GalleryHeader } from './GalleryHeader'
import { Lightbox } from './Lightbox'
import { MasonryGrid } from './MasonryGrid'
import { WORKS, filterWorks, type Genre, type MediaFilter } from './works'

export function WorkGallery() {
  const [media, setMedia] = useState<MediaFilter>('all')
  const [genre, setGenre] = useState<Genre | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const filtered = filterWorks(WORKS, media, genre)

  const changeMedia = (m: MediaFilter) => {
    setMedia(m)
    setLightboxIndex(null)
  }
  const changeGenre = (g: Genre | null) => {
    setGenre(g)
    setLightboxIndex(null)
  }

  return (
    <section className="py-16 md:py-24 px-4 md:px-20 bg-bg" id="work">
      <div className="max-w-[1500px] mx-auto">
        <GalleryHeader media={media} genre={genre} onMedia={changeMedia} onGenre={changeGenre} />

        {/* key remount gives a clean fade-in when the filter changes */}
        <div key={`${media}-${genre ?? 'all'}`} className="animate-[fadeIn_400ms_ease]">
          <MasonryGrid works={filtered} onOpen={setLightboxIndex} />
        </div>

        {filtered.length === 0 && (
          <p className="text-ash text-center py-16">No works in this category yet.</p>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          works={filtered}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </section>
  )
}
