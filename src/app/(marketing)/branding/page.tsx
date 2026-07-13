import EventJourney from '@/components/marketing/journey/EventJourney'
import { HeroOverlay } from '@/components/marketing/journey/overlays/HeroOverlay'
import { CoreServicesOverlay } from '@/components/marketing/journey/overlays/CoreServicesOverlay'
import { BrandBoardOverlay } from '@/components/marketing/journey/overlays/BrandBoardOverlay'
import { DeliverablesOverlay } from '@/components/marketing/journey/overlays/DeliverablesOverlay'
import { BuildPhasesOverlay } from '@/components/marketing/journey/overlays/BuildPhasesOverlay'
import { CtaOverlay } from '@/components/marketing/journey/overlays/CtaOverlay'

export const metadata = {
  title: 'Branding — Lyante Production',
  description:
    'Full-service brand building — strategy, identity, color, typography, brand boards, websites, social media, local SEO, content, paid ads and sustainable marketing.',
}

export default function BrandingPage() {
  return (
    <EventJourney
      overlays={[
        <HeroOverlay key="hero" />,
        <CoreServicesOverlay key="coreServices" />,
        <BrandBoardOverlay key="brandBoard" />,
        <DeliverablesOverlay key="deliverables" />,
        <BuildPhasesOverlay key="buildPhases" />,
        <CtaOverlay key="cta" />,
      ]}
    />
  )
}
