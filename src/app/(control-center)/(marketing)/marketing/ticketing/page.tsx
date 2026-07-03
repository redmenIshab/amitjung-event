import Link from 'next/link'

export const metadata = { title: 'Smart Ticketing — Lyante Production' }

export default function TicketingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 text-center">
      {/* Decorative icon */}
      <div className="w-16 h-16 rounded-full border border-gold/40 flex items-center justify-center mb-2">
        <svg
          viewBox="0 0 32 32"
          fill="none"
          stroke="#C8922A"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-8 h-8"
        >
          <path d="M4 10a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v3a3 3 0 0 0 0 6v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a3 3 0 0 0 0-6V10z" />
          <path d="M13 12v8M19 12v8" strokeDasharray="2 2" />
        </svg>
      </div>

      <p className="section-label tracking-widest">SMART TICKETING</p>

      <h1
        className="font-cormorant font-bold text-ivory leading-tight max-w-xl"
        style={{ fontSize: 'clamp(36px, 7vw, 72px)' }}
      >
        Ticketing, <span className="gold-text italic">reinvented</span> for Nepal.
      </h1>

      <p className="text-ash max-w-md leading-relaxed text-sm">
        QR-based entry, real-time attendee counts, digital ticket delivery — our smart ticketing
        platform is live for select events. Full public launch coming soon.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 mt-2">
        <Link
          href="/contact"
          className="px-6 py-3 bg-gold text-bg font-bebas tracking-widest text-sm hover:bg-gold-light transition-colors"
        >
          REQUEST EARLY ACCESS →
        </Link>
        <Link
          href="/"
          className="px-6 py-3 border border-coal text-ash font-bebas tracking-widest text-sm hover:border-gold hover:text-gold transition-colors"
        >
          ← BACK TO HOME
        </Link>
      </div>
    </div>
  )
}
