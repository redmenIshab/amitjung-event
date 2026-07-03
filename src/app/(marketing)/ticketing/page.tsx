import Link from 'next/link'
import Button from '@/components/marketing/ui/Button'
import TicketingHero from '@/components/marketing/sections/ticketing/TicketingHero'
import ScannerStatus from '@/components/marketing/sections/ticketing/ScannerStatus'
import TicketingFeatures from '@/components/marketing/sections/ticketing/TicketingFeatures'
import TicketingProcess from '@/components/marketing/sections/ticketing/TicketingProcess'

export const metadata = {
  title: 'Smart Ticketing — Lyante Production',
  description:
    'End-to-end event ticketing — unique tamper-proof QR codes, one-time validity, distribution stalls, a real-time check-in scanner, and infrastructure built for 10 lakh+ concurrent traffic.',
}

export default function TicketingPage() {
  return (
    <>
      <TicketingHero />
      <ScannerStatus />
      <TicketingFeatures />
      <TicketingProcess />

      {/* Closing CTA */}
      <section className="py-24 md:py-32 px-4 md:px-20 bg-bg text-center">
        <div className="max-w-3xl mx-auto">
          <p className="section-label mb-4">FOR EVENT ORGANIZERS</p>
          <h2 className="font-cormorant font-bold text-ivory mb-6 leading-tight" style={{ fontSize: 'var(--t-display)' }}>
            Hand us the gate.
          </h2>
          <p className="text-ash text-lg leading-relaxed mb-10">
            Planning a concert, festival or show? Tell us your expected crowd and dates &mdash;
            we&rsquo;ll design a ticketing operation that holds up under the rush.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button href="/contact" variant="gold">REQUEST A DEMO →</Button>
            <Button href="/work" variant="outline">SEE OUR WORK</Button>
          </div>
          <div className="mt-12">
            <Link href="/" className="text-gold text-sm hover:underline">← Back to Home</Link>
          </div>
        </div>
      </section>
    </>
  )
}
