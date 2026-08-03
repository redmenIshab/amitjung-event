'use client'

import { useEffect, useRef, useState } from 'react'
import { site } from '@/data/site'

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * Pinned-scroll band section. A sticky "stage" stays fixed while a stack of
 * full-height step sentinels scrolls behind it; an IntersectionObserver marks
 * the step crossing the viewport centre as active, cross-fading to that member.
 * Each member is a self-contained slide (photo + text) so the same markup
 * cross-fades on desktop and stacks vertically on mobile (see globals.css).
 * Pure CSS + IO — no animation library (this site ships zero extra deps).
 */
export default function Band() {
  const members = site.band
  const [active, setActive] = useState(0)
  const stepRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const idx = Number((entry.target as HTMLElement).dataset.index)
            if (!Number.isNaN(idx)) setActive(idx)
          }
        }
      },
      // A zero-height band at the vertical centre: whichever full-height step
      // covers the centre line is the active one.
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    )
    const els = stepRefs.current.filter(Boolean) as HTMLDivElement[]
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [members.length])

  const goTo = (i: number) =>
    stepRefs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <section id="band" className="band">
      <div className="wrap">
        <div className="sec-head reveal in">
          <p className="sec-kicker">The Band</p>
          <h2>Amit Jung and the Gorkhey</h2>
          <p>
            The live band behind the sound — scroll through each of the players
            who bring the songs to the stage.
          </p>
        </div>
      </div>

      <p className="band-hint">
        Swipe to meet the band <span>→</span>
      </p>

      <div className="band-inner">
        {/* Pinned stage (desktop) / horizontal card carousel (mobile) */}
        <div className="band-stage">
          <div className="band-slides">
            {members.map((m, i) => (
              <div key={i} className={`band-slide ${i === active ? 'on' : ''}`}>
                <div className="wrap band-slide-grid">
                  <figure className="band-photo">
                    {m.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.photo}
                        alt={m.name ?? m.role}
                        // Every slide is mounted at once, so only the first
                        // one competes for bandwidth on load.
                        loading={i === 0 ? 'eager' : 'lazy'}
                        fetchPriority={i === 0 ? 'auto' : 'low'}
                        decoding="async"
                      />
                    ) : (
                      <span className="band-photo-ph">
                        <b>{(m.name ?? m.role).charAt(0)}</b>
                        <em>{m.role}</em>
                        <i>Photo coming soon</i>
                      </span>
                    )}
                    <span className="band-photo-tag">{pad(i + 1)}</span>
                  </figure>

                  <div className="band-text">
                    <div className="band-index">
                      <span className="band-index-cur">{pad(i + 1)}</span>
                      <span className="band-index-tot">/ {pad(members.length)}</span>
                    </div>
                    <p className="band-role">{m.role}</p>
                    <h3 className="band-name">{m.name ?? m.role}</h3>
                    <p className="band-desc">{m.bio}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Shared progress rail (desktop) */}
          <ul className="band-rail">
            {members.map((m, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={i === active ? 'on' : ''}
                  onClick={() => goTo(i)}
                  aria-label={`Go to ${m.name ?? m.role}`}
                >
                  <span className="band-rail-dot" />
                  <span className="band-rail-label">{m.name ?? m.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Invisible scroll drivers (one full-height step per member) */}
        <div className="band-steps" aria-hidden="true">
          {members.map((_, i) => (
            <div
              key={i}
              data-index={i}
              ref={(el) => {
                stepRefs.current[i] = el
              }}
              className="band-step"
            />
          ))}
        </div>
      </div>
    </section>
  )
}
