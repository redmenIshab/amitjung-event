import EventJourney from '@/components/marketing/journey/EventJourney'
import { HeroOverlay } from '@/components/marketing/journey/overlays/HeroOverlay'
import { FeaturesOverlay } from '@/components/marketing/journey/overlays/FeaturesOverlay'
import { TicketsOverlay } from '@/components/marketing/journey/overlays/TicketsOverlay'
import { ScannerOverlay } from '@/components/marketing/journey/overlays/ScannerOverlay'
import { ScaleOverlay } from '@/components/marketing/journey/overlays/ScaleOverlay'
import { CtaOverlay } from '@/components/marketing/journey/overlays/CtaOverlay'

export const metadata = {
  title: 'Smart Ticketing — Lyante Production',
  description:
    'End-to-end event ticketing — unique tamper-proof QR codes, one-time validity, distribution stalls, a real-time check-in scanner, and infrastructure built for 10 lakh+ concurrent traffic.',
}

export default function TicketingPage() {
  return (
    <EventJourney
      overlays={[
        <HeroOverlay key="hero" />,
        <FeaturesOverlay key="features" />,
        <TicketsOverlay key="tickets" />,
        <ScannerOverlay key="scanner" />,
        <ScaleOverlay key="scale" />,
        <CtaOverlay key="cta" />,
      ]}
    />
  )
}
