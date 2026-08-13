import Button from '@/components/marketing/ui/Button'
import { OverlayShell } from './OverlayShell'

export function CtaOverlay() {
  return (
    <OverlayShell label="FOR EVENT ORGANIZERS">
      <div className="text-center">
        <h2 className="font-cormorant font-bold text-ivory text-4xl md:text-6xl mb-6 leading-tight">
          Hand us the gate.
        </h2>
        <p className="text-ash text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Planning a concert, festival or show? Tell us your expected crowd and dates &mdash;
          we&rsquo;ll design a ticketing operation that holds up under the rush.
        </p>
        <div className="flex flex-wrap gap-4 justify-center pointer-events-auto">
          <Button href="/contact" variant="gold">
            REQUEST A DEMO →
          </Button>
          <Button href="/about#work" variant="outline">
            SEE OUR WORK
          </Button>
        </div>
      </div>
    </OverlayShell>
  )
}
