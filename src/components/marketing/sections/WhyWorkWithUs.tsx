const ARTISTS = [
  'Mercedes Benz', '1974 AD', 'Bipul Chhetri', 'Albatross', 'Kanta Dab Dab', 'The Prism',
]

const BRANDS = [
  'Tuborg Nepal', 'Xtreme', 'Chiya Station', 'The Maali Kitchen', 'Brewista',
]

const PILLARS = [
  {
    label: 'SISTER VENTURE',
    title: 'Social Café, Itahari',
    body:
      'The beating heart of Purba Nepal — a hub for IT, entrepreneurship, music and community-building events, wrapped in the best coffee, bakery and ambience in Itahari. We built the room where the scene gathers.',
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
    title: 'Nepal Music Festival',
    body:
      "Asia's biggest volunteer-run festival — staging concerts, shows and multi-day festivals for legendary bands and artists. We know what it takes to move crowds, secure sponsors and run a show at scale.",
    icon: (
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 4v16" />
        <circle cx="12" cy="22" r="4" />
        <path d="M20 8l6-2v10" />
        <circle cx="22" cy="20" r="4" />
      </svg>
    ),
  },
]

export default function WhyWorkWithUs() {
  return (
    <section className="py-20 md:py-16 px-4 md:px-20 bg-surface" id="why-us">
      <div className="max-w-[1400px] mx-auto">
        <p className="section-label mb-3">WHY WORK WITH US</p>
        <h2
          className="font-cormorant font-bold text-ivory mb-6"
          style={{ fontSize: 'var(--t-display)' }}
        >
          Built by owners. Proven on stage.
        </h2>
        <p className="text-ash text-lg leading-relaxed max-w-3xl mb-16">
          We&rsquo;re not an outside agency guessing at your goals. We understand the essentials of a
          business from an <span className="text-ivory">owner&rsquo;s point of view</span> &mdash; and
          the craft of marketing, buzz-creation and documentation from an{' '}
          <span className="text-ivory">event organizer&rsquo;s and manager&rsquo;s point of view</span>.
          Lyante is born from two ventures that have built the room and filled the stage themselves.
        </p>

        {/* Pedigree pillars */}
        <div className="grid md:grid-cols-2 gap-4 mb-16">
          {PILLARS.map((p) => (
            <div
              key={p.title}
              className="gold-border rounded-sm p-8 bg-bg flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1 hover:bg-surface-mid"
            >
              <div className="text-gold w-9 h-9">{p.icon}</div>
              <p className="section-label">{p.label}</p>
              <h3 className="font-cormorant font-bold text-ivory text-3xl leading-tight">
                {p.title}
              </h3>
              <p className="text-ash text-sm leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>

        {/* Artist roster */}
        <p className="section-label mb-5">STAGES WE&rsquo;VE SHARED</p>
        <div className="flex flex-wrap gap-3 mb-12">
          {ARTISTS.map((a) => (
            <span
              key={a}
              className="font-bebas text-lg tracking-widest text-ash border border-coal px-4 py-2 rounded-sm transition-colors duration-200 hover:border-gold hover:text-gold"
            >
              {a}
            </span>
          ))}
        </div>

        {/* Brand roster */}
        <p className="section-label mb-2">BRANDS WE&rsquo;VE COVERED</p>
        <div className="flex flex-wrap gap-3">
          {BRANDS.map((b) => (
            <span
              key={b}
              className="font-bebas text-lg tracking-widest text-ash border border-coal px-4 py-2 rounded-sm transition-colors duration-200 hover:border-gold hover:text-gold"
            >
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
