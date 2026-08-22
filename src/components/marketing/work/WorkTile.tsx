'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import type { Work } from './works'
import { mediaUrl } from '@/lib/media'

export function WorkTile({
  work,
  index,
  onOpen,
}: {
  work: Work
  index: number
  onOpen: () => void
}) {
  const tileRef = useRef<HTMLButtonElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [revealed, setRevealed] = useState(false)

  // One-shot scroll reveal; skipped entirely under prefers-reduced-motion.
  useEffect(() => {
    const el = tileRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const play = () => {
    videoRef.current?.play().catch(() => {})
  }
  const stop = () => {
    const v = videoRef.current
    if (!v) return
    v.pause()
    v.currentTime = 0
  }

  return (
    <button
      ref={tileRef}
      onClick={onOpen}
      onMouseEnter={work.type === 'video' ? play : undefined}
      onMouseLeave={work.type === 'video' ? stop : undefined}
      className="group relative block w-full break-inside-avoid mb-4 rounded-sm overflow-hidden text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 500ms ease ${(index % 6) * 60}ms, transform 500ms ease ${(index % 6) * 60}ms`,
      }}
      aria-label={`${work.title} — ${work.genre}${work.type === 'video' ? ' (video)' : ''}`}
    >
      <div className="relative w-full" style={{ aspectRatio: `${work.width} / ${work.height}` }}>
        {work.type === 'photo' ? (
          <Image
            src={mediaUrl(work.src, { width: 1200 }) ?? ''}
            alt={work.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw"
            priority={index < 4}
            unoptimized
          />
        ) : (
          <video
            ref={videoRef}
            src={mediaUrl(work.src, { resourceType: 'video', format: 'mp4' }) ?? ''}
            poster={mediaUrl(work.poster, { width: 1200 }) ?? undefined}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* video badge */}
        {work.type === 'video' && (
          <span className="absolute top-3 right-3 w-8 h-8 rounded-full bg-bg/70 border border-gold/60 flex items-center justify-center">
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden>
              <path d="M0 0L10 6L0 12V0Z" fill="#C8922A" />
            </svg>
          </span>
        )}

        {/* hover caption */}
        <div
          className="absolute inset-x-0 bottom-0 pt-16 pb-4 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(8,8,8,0.85) 0%, rgba(139,94,16,0.25) 60%, transparent 100%)',
          }}
        >
          <p className="font-cormorant italic text-gold text-lg leading-tight">{work.title}</p>
          <p className="section-label mt-1">{work.genre}</p>
        </div>
      </div>
    </button>
  )
}
