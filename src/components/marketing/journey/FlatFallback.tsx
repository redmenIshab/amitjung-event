import TicketingHero from '@/components/marketing/sections/ticketing/TicketingHero'
import ScannerStatus from '@/components/marketing/sections/ticketing/ScannerStatus'
import TicketingFeatures from '@/components/marketing/sections/ticketing/TicketingFeatures'
import TicketingProcess from '@/components/marketing/sections/ticketing/TicketingProcess'
import ClosingCta from '@/components/marketing/sections/ticketing/ClosingCta'

/**
 * The no-WebGL ticketing page: the same marketing content, flat. Shipped in the
 * initial bundle and rendered on the server, so it must never import three.js.
 */
export function FlatFallback() {
  return (
    <>
      <TicketingHero />
      <ScannerStatus />
      <TicketingFeatures />
      <TicketingProcess />
      <ClosingCta />
    </>
  )
}
