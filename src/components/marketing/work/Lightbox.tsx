'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef } from 'react'
import type { Work } from './works'
import { mediaUrl } from '@/lib/media'

export function Lightbox({
  works,
  index,
  onClose,
  onNavigate,
}: {
  works: Work[]
  index: number
  onClose: () => void
  onNavigate: (next: number) => void
}) {
  const work = works[index]
  const touchStartX = useRef<number | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const prev = useCallback(
    () => onNavigate((index - 1 + works.length) % works.length),
    [index, works.length, onNavigate]
  )
  const next = useCallback(
    () => onNavigate((index + 1) % works.length),
    [index, works.length, onNavigate]
  )

  // Keyboard controls + body scroll lock + initial focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose, prev, next])

  if (!work) return null

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${work.title} — ${work.genre}`}
      tabIndex={-1}
      className="fixed inset-0 z-[100] flex items-center justify-center outline-none"
      style={{ backgroundColor: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0].clientX
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return
        const dx = e.changedTouches[0].clientX - touchStartX.current
        touchStartX.current = null
        if (Math.abs(dx) > 48) (dx > 0 ? prev : next)()
      }}
    >
      {/* media */}
      <div
        className="relative"
        style={{ width: 'min(90vw, 1200px)', height: '82vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {work.type === 'photo' ? (
          <Image
            src={mediaUrl(work.src, { width: 1920 }) ?? ''}
            alt={work.title}
            fill
            className="object-contain"
            sizes="90vw"
            priority
            unoptimized
          />
        ) : (
          <video
            key={work.src}
            src={mediaUrl(work.src, { resourceType: 'video', format: 'mp4' }) ?? ''}
            poster={mediaUrl(work.poster, { width: 1920 }) ?? undefined}
            controls
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}
      </div>

      {/* caption */}
      <div className="absolute bottom-6 left-6 pointer-events-none">
        <p className="font-cormorant italic text-gold text-2xl leading-tight">{work.title}</p>
        <p className="section-label mt-1">{work.genre}</p>
      </div>

      {/* counter */}
      <p className="absolute bottom-6 right-6 font-dm-mono text-xs text-ash pointer-events-none">
        {String(index + 1).padStart(2, '0')} / {String(works.length).padStart(2, '0')}
      </p>

      {/* close */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 w-11 h-11 rounded-full border border-coal text-ash hover:border-gold hover:text-gold transition-colors flex items-center justify-center text-xl"
      >
        ✕
      </button>

      {/* prev / next */}
      {works.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            aria-label="Previous work"
            className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-coal text-ash hover:border-gold hover:text-gold transition-colors items-center justify-center hidden md:flex"
          >
            ←
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            aria-label="Next work"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border border-coal text-ash hover:border-gold hover:text-gold transition-colors items-center justify-center hidden md:flex"
          >
            →
          </button>
        </>
      )}
    </div>
  )
}
