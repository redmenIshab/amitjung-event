const ARTISTS = [
  'Mercedes Benz', '1974 AD', 'Bipul Chhetri', 'Albatross', 'Kanta Dab Dab', 'The Prism',
]

const BRANDS = [
  'Tuborg Nepal', 'Xtreme', 'Chiya Station', 'The Maali Kitchen', 'Brewista',
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
          We&rsquo;ve been on both sides of the table.
        </h2>
        <p className="text-ash text-lg leading-relaxed max-w-3xl mb-16">
          We&rsquo;re not an outside agency guessing at your goals. We understand the essentials of a
          business from an <span className="text-ivory">owner&rsquo;s point of view</span> &mdash; and
          the craft of marketing, buzz-creation and documentation from an{' '}
          <span className="text-ivory">event organizer&rsquo;s and manager&rsquo;s point of view</span>.
        </p>

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
