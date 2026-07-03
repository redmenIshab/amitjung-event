'use client'

import { useEffect, useRef, useState } from 'react'
import { ReactNode } from 'react'

const g = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    {d.split('|').map((p, i) => <path key={i} d={p} />)}
  </svg>
)

const ITEMS: { title: string; body: string; wide?: boolean; icon: ReactNode }[] = [
  { title: 'Unique QR per Ticket', wide: true,
    body: 'Every ticket carries its own cryptographically-signed code. No two are alike, and none can be guessed or generated.',
    icon: g('M4 4h6v6H4z|M14 4h6v6h-6z|M4 14h6v6H4z|M14 14h3v3h-3z|M17 17h3v3h-3z') },
  { title: 'One-Time-Only Validity',
    body: 'A code works exactly once. The moment it&rsquo;s scanned, re-entry on the same ticket is blocked.',
    icon: g('M12 3a9 9 0 1 0 9 9|M8.5 12l2.5 2.5L16 9') },
  { title: 'Tamper-Proof by Design',
    body: 'Server-side validation on every scan. Screenshots, copies and edited codes are rejected instantly.',
    icon: g('M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z|M9.5 12l1.8 1.8L15 10') },
  { title: 'Built for 10 Lakh+ Traffic', wide: true,
    body: 'Our infrastructure absorbs a million-plus concurrent scans without slowing the gate down &mdash; peak-crowd ready.',
    icon: g('M3 20a9 9 0 0 1 18 0|M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6|M6 11a2 2 0 1 0 0-4|M18 11a2 2 0 1 0 0-4') },
  { title: 'Distribution Stalls',
    body: 'We set up and staff on-ground sale &amp; collection points so buyers get tickets fast, in person.',
    icon: g('M4 9l1-4h14l1 4|M4 9h16v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z|M6 14v6h12v-6') },
  { title: 'Real-Time Scanner Dashboard',
    body: 'Checked-in, failed, duplicate and pending — every status visualized live across all gates.',
    icon: g('M4 5h16v11H4z|M4 20h16|M8 12l2.5-3 2 2.5L15 8') },
  { title: 'Digital Payments',
    body: 'Khalti and eSewa checkout built in, with instant ticket delivery to the buyer.',
    icon: g('M3 7h18v10H3z|M3 11h18|M7 15h3') },
  { title: 'We Design & Manage End-to-End', wide: true,
    body: 'Ticket design, printing, distribution, gate staffing and live reporting &mdash; a single team owns it, so you just run your event.',
    icon: g('M12 3l2.4 5 5.6.6-4 3.9 1 5.5-5-2.7-5 2.7 1-5.5-4-3.9 5.6-.6z') },
  { title: 'Live Reports & Reconciliation',
    body: 'Sales, entries and no-shows reconciled in real time and exported after the show.',
    icon: g('M5 4h14v16H5z|M9 9h6|M9 13h6|M9 17h3') },
]

export default function TicketingFeatures() {
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
    <section ref={ref} className="py-24 md:py-32 px-4 md:px-20 bg-bg">
      <div className="max-w-[1400px] mx-auto">
        <p className="section-label mb-3">WHY ORGANIZERS WORK WITH US</p>
        <h2 className="font-cormorant font-bold text-ivory mb-4 leading-tight" style={{ fontSize: 'var(--t-display)' }}>
          Everything the gate needs.
        </h2>
        <p className="text-ash text-lg leading-relaxed max-w-2xl mb-14">
          From the first ticket printed to the last person through the gate, here&rsquo;s what you get
          when you hand ticketing to us.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {ITEMS.map((item, i) => (
            <div
              key={item.title}
              className={`group gold-border rounded-sm p-6 bg-surface flex flex-col gap-4 transition-all duration-200 hover:-translate-y-1 hover:bg-surface-mid hover:gold-border-strong ${item.wide ? 'md:col-span-2' : ''}`}
              style={{
                opacity: on ? 1 : 0,
                transform: on ? 'translateY(0)' : 'translateY(18px)',
                transition: `opacity 500ms ease ${i * 60}ms, transform 500ms ease ${i * 60}ms`,
              }}
            >
              <div className="text-gold w-7 h-7">{item.icon}</div>
              <div>
                <h3 className="font-dm-sans font-bold text-ivory text-xl leading-tight mb-2">{item.title}</h3>
                <p className="text-ash text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: item.body }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
