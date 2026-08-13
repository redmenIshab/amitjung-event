import type { CSSProperties, ReactNode } from 'react'

interface Venture {
  label: string
  name: string
  tagline: string
  domain: string
  href: string
  body: string
  /** Accent pulled toward the venture's own site palette, lightened enough to
   *  stay legible on Lyante's near-black background. `tint` washes the card,
   *  `glow` is the radial bloom that fades in on hover. */
  theme: { accent: string; line: string; tint: string; glow: string }
  icon: ReactNode
}

const VENTURES: Venture[] = [
  {
    label: 'SISTER VENTURE · ITAHARI',
    name: 'Social Café',
    tagline: 'Connecting the Dots',
    domain: 'socialcafe.com.np',
    href: 'https://socialcafe.com.np',
    body:
      'Since 2016 — a café, co-working floor, meeting rooms and open garden built as one room for entrepreneurs, academics, artists and emerging leaders. The place where the Purba Nepal scene gathers, over Himalayan coffee.',
    theme: {
      accent: '#63a664',
      line: 'rgba(99, 166, 100, 0.28)',
      tint: 'rgba(99, 166, 100, 0.07)',
      glow: 'rgba(99, 166, 100, 0.18)',
    },
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 13h16v5a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6z" />
        <path d="M22 14h3a3 3 0 0 1 0 6h-3" />
        <path d="M10 4c-1 1.5-1 3 0 4.5M15 4c-1 1.5-1 3 0 4.5" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    label: 'FESTIVAL PEDIGREE',
    name: 'Nepal Music Festival',
    tagline: 'Bringing Vision to Life',
    domain: 'nepalmusicfestival.org',
    href: 'https://nepalmusicfestival.org',
    body:
      'A non-profit, volunteer-run annual festival celebrating Nepalese and international musicians — arguably the biggest and most unique in South Asia. We know what it takes to move crowds, secure sponsors and run a show at scale.',
    theme: {
      accent: '#4f9ce8',
      line: 'rgba(79, 156, 232, 0.28)',
      tint: 'rgba(79, 156, 232, 0.07)',
      glow: 'rgba(79, 156, 232, 0.18)',
    },
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 4v16" />
        <circle cx="12" cy="22" r="4" />
        <path d="M20 8l6-2v10" />
        <circle cx="22" cy="20" r="4" />
      </svg>
    ),
  },
  {
    label: 'TECHNOLOGY ARM',
    name: 'Software Factory',
    tagline: 'Empowering Businesses with Cutting-Edge Software Solutions',
    domain: 'factorysoftwareai.com',
    href: 'https://factorysoftwareai.com',
    body:
      'Five years of IT-centric work, serving IT solutions around the world — cloud and DevOps, AI and machine learning, full-stack product builds, UX/UI and QA. Teams across Eastern Nepal and Eastern Europe.',
    theme: {
      accent: '#2f9e78',
      line: 'rgba(47, 158, 120, 0.26)',
      tint: 'rgba(20, 84, 64, 0.14)',
      glow: 'rgba(24, 112, 84, 0.24)',
    },
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="9" y="9" width="14" height="14" rx="2" />
        <path d="M13 4v5M19 4v5M13 23v5M19 23v5M4 13h5M4 19h5M23 13h5M23 19h5" strokeWidth="1.2" />
        <path d="M14 14l-1.5 2 1.5 2M18 14l1.5 2-1.5 2" strokeWidth="1.2" />
      </svg>
    ),
  },
]

export default function VenturesHero() {
  return (
    <section className="pt-32 md:pt-40 pb-16 md:pb-20 px-4 md:px-20 bg-bg" id="about">
      <div className="max-w-[1400px] mx-auto">
        <p className="section-label mb-3">ABOUT US</p>
        <h1
          className="font-cormorant font-bold text-ivory mb-6"
          style={{ fontSize: 'var(--t-display)' }}
        >
          Built by owners. Proven on stage.
        </h1>
        <p className="text-ash text-lg leading-relaxed max-w-3xl mb-14">
          Lyante Production isn&rsquo;t an outside agency guessing at your goals. We are born from
          three ventures that built the room, filled the stage and shipped the software themselves
          &mdash; a community hub, a festival, and an engineering team.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {VENTURES.map((v) => (
            <a
              key={v.name}
              href={v.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden rounded-sm p-8 flex flex-col gap-4 bg-bg border border-[var(--brand-line)] hover:border-[var(--brand)] transition-all duration-200 hover:-translate-y-1"
              style={
                {
                  '--brand': v.theme.accent,
                  '--brand-line': v.theme.line,
                  backgroundImage: `linear-gradient(160deg, ${v.theme.tint} 0%, transparent 62%)`,
                } as CSSProperties
              }
            >
              {/* Brand bloom — only on hover, so the trio reads calm at rest */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: `radial-gradient(circle, ${v.theme.glow} 0%, transparent 70%)` }}
              />

              <div className="relative w-9 h-9 text-[var(--brand)]">{v.icon}</div>
              {/* section-label's own gold `color` would race this one in the
                  utilities layer, so spell the type out and own the color. */}
              <p className="relative text-[length:var(--t-caption)] font-medium tracking-[0.12em] uppercase text-[var(--brand)]">
                {v.label}
              </p>
              <h2 className="relative font-cormorant font-bold text-ivory text-3xl leading-tight">
                {v.name}
              </h2>
              <p className="relative font-cormorant italic text-[var(--brand)] text-lg leading-snug">
                {v.tagline}
              </p>
              <p className="relative text-ash text-sm leading-relaxed">{v.body}</p>

              <span className="relative mt-auto pt-2 font-dm-mono text-xs tracking-wide text-ash group-hover:text-[var(--brand)] transition-colors duration-200">
                {v.domain} ↗
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
