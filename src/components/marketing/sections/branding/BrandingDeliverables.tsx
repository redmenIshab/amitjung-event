'use client'

import { useEffect, useRef, useState } from 'react'
import { ReactNode } from 'react'

type Item = { n: string; title: string; body: string; wide?: boolean; icon: ReactNode }

const s = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
)

const ITEMS: Item[] = [
  { n: '01', title: 'Brand Strategy & Positioning', wide: true,
    body: 'Where you sit in the market, who you speak to, and the promise you own. The foundation every other decision stands on.',
    icon: s('M12 3v18|M3 12h18|M5.6 5.6l12.8 12.8|M18.4 5.6L5.6 18.4') },
  { n: '02', title: 'USP Development',
    body: 'We find the one thing only you can say — and make it impossible to ignore.',
    icon: s('M12 2l2.4 6.9H22l-6 4.4 2.3 7-6.3-4.5L5.7 20l2.3-7-6-4.4h7.6z') },
  { n: '03', title: 'Visual Identity & Logo',
    body: 'Primary mark, monograms, lockups and responsive variations for every surface.',
    icon: s('M4 4h7v7H4z|M13 13h7v7h-7z|M13 4h7v7h-7z|M4 13h7v7H4z') },
  { n: '04', title: 'Color Systems',
    body: 'A palette with hierarchy, contrast and accessibility built in.',
    icon: s('M12 3a9 9 0 1 0 0 18c1.7 0 2-1.3 1.2-2.2-.8-1 0-2.3 1.3-2.3H18a3 3 0 0 0 3-3 9 9 0 0 0-9-8.5z|M7.5 11.5h.01|M11 7.5h.01|M15.5 8.5h.01') },
  { n: '05', title: 'Typography',
    body: 'Type pairings and a scale that keeps every layout in rhythm.',
    icon: s('M5 6h14|M12 6v13|M9 19h6') },
  { n: '06', title: 'Brand Boards & Guidelines', wide: true,
    body: 'A single style-guide document your whole team — and ours — designs against, so nothing drifts off-brand.',
    icon: s('M5 3h11l3 3v15H5z|M9 8h7|M9 12h7|M9 16h4') },
  { n: '07', title: 'Website Design & Build', wide: true,
    body: 'Fast, responsive, conversion-focused sites — from landing pages to full experiences, wired to your brand system.',
    icon: s('M3 5h18v14H3z|M3 9h18|M6 7h.01|M9 7h.01') },
  { n: '08', title: 'Social Media Accounts',
    body: 'Set up, optimised and managed — profiles that look official and stay active.',
    icon: s('M18 8a3 3 0 1 0-3-3|M6 15a3 3 0 1 0 0 .01|M18 19a3 3 0 1 0 0 .01|M8.6 13.5l6.8-4|M8.6 15.5l6.8 3.5') },
  { n: '09', title: 'Local SEO & Google Presence',
    body: 'Show up first in area searches, Maps and “near me” — where buyers are already looking.',
    icon: s('M11 4a7 7 0 0 1 7 7c0 4.5-7 10-7 10s-7-5.5-7-10a7 7 0 0 1 7-7z|M11 11h.01|M17 17l4 4') },
  { n: '10', title: 'Content Planning & Creation', wide: true,
    body: 'A calendar with intent — photo, video, reels, graphics and copy shot and shipped on schedule.',
    icon: s('M5 4h14v16H5z|M9 4v16|M12 9h5|M12 13h5') },
  { n: '11', title: 'Paid Ads & Boosting',
    body: 'Targeted spend on Meta, Google and beyond — tracked, tuned and reported.',
    icon: s('M3 17l5-5 3 3 6-7|M14 8h5v5') },
  { n: '12', title: 'Hype Building & Launch Buzz',
    body: 'Teasers, countdowns and drops that turn a launch into an event people wait for.',
    icon: s('M4 14l9-9 3 3-9 9H4z|M13 5l3 3|M4 20h16') },
  { n: '13', title: 'Sustainable Marketing Strategy', wide: true,
    body: 'Not a one-off campaign — a system that keeps compounding attention long after launch day.',
    icon: s('M12 3a9 9 0 1 0 9 9|M21 5v4h-4|M12 8v4l3 2') },
  { n: '14', title: 'Brand Visualization & Perception',
    body: 'We shape how the market feels about you — and prove it moves in the right direction.',
    icon: s('M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z|M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z') },
]

export default function BrandingDeliverables() {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section id="deliverables" ref={ref} className="py-24 md:py-32 px-4 md:px-20 bg-bg">
      <div className="max-w-[1400px] mx-auto">
        <p className="section-label mb-3">WHAT YOU GET</p>
        <h2
          className="font-cormorant font-bold text-ivory mb-4 leading-tight"
          style={{ fontSize: 'var(--t-display)' }}
        >
          Your brand, end to end.
        </h2>
        <p className="text-ash text-lg leading-relaxed max-w-2xl mb-14">
          One partner for the whole picture — strategy, identity, presence and paid growth. Here is
          everything we put to work for your brand.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ITEMS.map((item, i) => (
            <div
              key={item.n}
              className={`group gold-border rounded-sm p-6 bg-surface flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1 hover:bg-surface-mid hover:gold-border-strong ${
                item.wide ? 'md:col-span-2' : ''
              }`}
              style={{
                opacity: on ? 1 : 0,
                transform: on ? 'translateY(0)' : 'translateY(18px)',
                transition: `opacity 500ms ease ${i * 60}ms, transform 500ms ease ${i * 60}ms`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-gold w-7 h-7">{item.icon}</div>
                <span className="font-dm-mono text-xs text-coal group-hover:text-gold transition-colors">
                  {item.n}
                </span>
              </div>
              <div>
                <h3 className="font-dm-sans font-bold text-ivory text-xl leading-tight mb-2">
                  {item.title}
                </h3>
                <p className="text-ash text-sm leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
