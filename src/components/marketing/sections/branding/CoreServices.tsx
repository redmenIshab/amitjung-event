'use client'

import { useEffect, useRef, useState } from 'react'

/* Count-up used by the social card */
function useCountUp(target: number, run: boolean, ms = 1400) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min((t - start) / ms, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [run, target, ms])
  return n
}

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`)

/* ── Visual: Content Creation — floating frame stack ── */
function ContentVisual({ on }: { on: boolean }) {
  return (
    <div className="relative h-64 md:h-80 flex items-center justify-center">
      {/* back frame */}
      <div
        className="absolute w-40 h-52 rounded-sm bg-surface-mid gold-border"
        style={{
          transform: on ? 'translate(-58px,-10px) rotate(-9deg)' : 'translate(0,20px) rotate(0deg)',
          opacity: on ? 1 : 0,
          transition: 'all 700ms cubic-bezier(0.2,0.8,0.2,1) 120ms',
        }}
      />
      {/* mid frame */}
      <div
        className="absolute w-40 h-52 rounded-sm bg-surface gold-border"
        style={{
          transform: on ? 'translate(58px,6px) rotate(8deg)' : 'translate(0,20px) rotate(0deg)',
          opacity: on ? 1 : 0,
          transition: 'all 700ms cubic-bezier(0.2,0.8,0.2,1) 60ms',
        }}
      />
      {/* front frame */}
      <div
        className="relative w-44 h-56 rounded-sm bg-bg gold-border-strong border border-gold/60 flex flex-col p-3"
        style={{
          transform: on ? 'translateY(0)' : 'translateY(20px)',
          opacity: on ? 1 : 0,
          transition: 'all 700ms cubic-bezier(0.2,0.8,0.2,1)',
          animation: on ? 'floatFrame 5s ease-in-out infinite 700ms' : 'none',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="font-dm-mono text-[10px] text-gold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" style={{ animation: 'recBlink 1.4s steps(1) infinite' }} />
            REC
          </span>
          <span className="font-dm-mono text-[10px] text-ash">4K · REEL</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border border-gold/70 flex items-center justify-center">
            <span className="text-gold text-lg ml-0.5">▶</span>
          </div>
        </div>
        <div className="flex gap-1">
          {[40, 70, 30, 55].map((w, i) => (
            <div key={i} className="h-1 rounded-full bg-gold/50" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Visual: Social Media — post card with live stats ── */
function SocialVisual({ on }: { on: boolean }) {
  const likes = useCountUp(2400, on)
  const followers = useCountUp(18600, on)
  return (
    <div className="relative h-64 md:h-80 flex items-center justify-center">
      <div
        className="w-64 rounded-sm bg-surface gold-border p-4"
        style={{
          opacity: on ? 1 : 0,
          transform: on ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 650ms cubic-bezier(0.2,0.8,0.2,1)',
          animation: on ? 'floatFrame 6s ease-in-out infinite 650ms' : 'none',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full border border-gold/50 flex items-center justify-center">
            <span className="gold-text font-cormorant font-bold italic text-sm">L</span>
          </div>
          <div>
            <p className="font-dm-sans text-ivory text-xs font-bold leading-none">@yourbrand</p>
            <p className="font-dm-mono text-[9px] text-ash mt-0.5">{fmt(followers)} followers</p>
          </div>
          <span className="ml-auto font-dm-mono text-[9px] text-gold border border-gold/40 rounded-full px-2 py-0.5">
            +128 today
          </span>
        </div>
        <div className="h-24 rounded-sm bg-gradient-to-br from-surface-mid to-bg mb-3 flex items-center justify-center">
          <span className="font-bebas text-coal tracking-widest text-2xl">POST 01</span>
        </div>
        <div className="flex items-center gap-4 font-dm-mono text-[11px] text-ash">
          <span className="text-gold">♥ {fmt(likes)}</span>
          <span>💬 312</span>
          <span>↗ 96</span>
        </div>
      </div>
    </div>
  )
}

/* ── Visual: Website — browser building in ── */
function WebsiteVisual({ on }: { on: boolean }) {
  return (
    <div className="relative h-64 md:h-80 flex items-center justify-center">
      <div
        className="w-72 rounded-sm bg-surface gold-border overflow-hidden"
        style={{
          opacity: on ? 1 : 0,
          transform: on ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 650ms cubic-bezier(0.2,0.8,0.2,1)',
        }}
      >
        {/* chrome */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-mid border-b border-coal/40">
          <span className="w-2 h-2 rounded-full bg-coal" />
          <span className="w-2 h-2 rounded-full bg-coal" />
          <span className="w-2 h-2 rounded-full bg-coal" />
          <span className="ml-2 flex-1 h-3 rounded-full bg-bg/60 flex items-center px-2">
            <span className="font-dm-mono text-[8px] text-ash">yourbrand.com</span>
          </span>
        </div>
        {/* body — staggered build */}
        <div className="p-4 flex flex-col gap-2">
          {[
            <div key="h" className="h-10 rounded-sm bg-gradient-to-r from-gold/30 to-transparent" />,
            <div key="t1" className="h-2 w-3/4 rounded-full bg-coal" />,
            <div key="t2" className="h-2 w-2/3 rounded-full bg-coal" />,
            <div key="b" className="h-6 w-24 rounded-sm bg-gold/70 mt-1" />,
            <div key="g" className="grid grid-cols-3 gap-2 mt-1">
              <div className="h-10 rounded-sm bg-surface-mid" />
              <div className="h-10 rounded-sm bg-surface-mid" />
              <div className="h-10 rounded-sm bg-surface-mid" />
            </div>,
          ].map((el, i) => (
            <div
              key={i}
              style={{
                opacity: on ? 1 : 0,
                transform: on ? 'translateY(0)' : 'translateY(8px)',
                transition: `all 400ms steps(3, end) ${400 + i * 160}ms`,
              }}
            >
              {el}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const SERVICES = [
  {
    n: '01',
    label: 'CONTENT CREATION',
    title: 'Content that stops the scroll.',
    body: 'Photo, video, reels, graphics and copy — planned on a calendar and shot to a standard that makes your brand look like the biggest name in the room.',
    chips: ['Reels & Video', 'Photography', 'Graphics', 'Copywriting', 'Content Calendar'],
    Visual: ContentVisual,
  },
  {
    n: '02',
    label: 'SOCIAL MEDIA MANAGEMENT',
    title: 'Accounts that actually grow.',
    body: 'We set up, optimise and run your profiles end to end — posting, engaging and reporting — so your presence stays active, official and always on-brand.',
    chips: ['Account Setup', 'Daily Posting', 'Community & DMs', 'Growth & Analytics', 'Paid Boosting'],
    Visual: SocialVisual,
  },
  {
    n: '03',
    label: 'WEBSITE BUILDING',
    title: 'A home base that converts.',
    body: 'Fast, responsive, search-ready websites — from a single landing page to a full experience — wired to your brand system and built to turn visitors into customers.',
    chips: ['Landing Pages', 'Full Websites', 'Responsive', 'SEO-Ready', 'Fast & Secure'],
    Visual: WebsiteVisual,
  },
]

function ServiceRow({ s, i }: { s: (typeof SERVICES)[number]; i: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } },
      { threshold: 0.25 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const reversed = i % 2 === 1
  const { Visual } = s

  return (
    <div ref={ref} className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
      {/* Text */}
      <div
        className={reversed ? 'md:order-2' : ''}
        style={{
          opacity: on ? 1 : 0,
          transform: on ? 'translateX(0)' : `translateX(${reversed ? '20px' : '-20px'})`,
          transition: 'all 650ms cubic-bezier(0.2,0.8,0.2,1)',
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="font-dm-mono text-sm text-gold">{s.n}</span>
          <span className="h-[1px] w-8 bg-gold/50" />
          <p className="section-label">{s.label}</p>
        </div>
        <h3
          className="font-cormorant font-bold text-ivory mb-5 leading-tight"
          style={{ fontSize: 'var(--t-title)' }}
        >
          {s.title}
        </h3>
        <p className="text-ash text-lg leading-relaxed mb-6">{s.body}</p>
        <div className="flex flex-wrap gap-2">
          {s.chips.map((c) => (
            <span
              key={c}
              className="font-dm-mono text-[11px] text-ash border border-coal rounded-full px-3 py-1.5 transition-colors hover:border-gold hover:text-gold"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Visual */}
      <div className={reversed ? 'md:order-1' : ''}>
        <Visual on={on} />
      </div>
    </div>
  )
}

export default function CoreServices() {
  return (
    <section className="py-24 md:py-32 px-4 md:px-20 bg-surface-mid overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        <p className="section-label mb-3">WHAT WE DO BEST</p>
        <h2
          className="font-cormorant font-bold text-ivory mb-4 leading-tight"
          style={{ fontSize: 'var(--t-display)' }}
        >
          The three engines of your brand.
        </h2>
        <p className="text-ash text-lg leading-relaxed max-w-2xl mb-20">
          Content, social and web are the day-to-day work that keeps your brand visible and growing.
          This is where we spend most of ours.
        </p>

        <div className="flex flex-col gap-24 md:gap-32">
          {SERVICES.map((s, i) => (
            <ServiceRow key={s.n} s={s} i={i} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes floatFrame {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes recBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.2; }
        }
      `}</style>
    </section>
  )
}
