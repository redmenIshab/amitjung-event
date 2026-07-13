import Button from '@/components/marketing/ui/Button'
import { OverlayShell } from './OverlayShell'

export function CtaOverlay() {
  return (
    <OverlayShell label="LET'S BUILD">
      <div className="text-center">
        <h2 className="font-cormorant font-bold text-ivory text-4xl md:text-6xl mb-6 leading-tight">
          Ready to become unforgettable?
        </h2>
        <p className="text-ash text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Tell us about your brand and where you want it to go. We&rsquo;ll show you exactly how
          we&rsquo;d get you there.
        </p>
        <div className="flex flex-wrap gap-4 justify-center pointer-events-auto">
          <Button href="/contact" variant="gold">
            BRIEF US →
          </Button>
          <Button href="/work" variant="outline">
            SEE OUR WORK
          </Button>
        </div>
      </div>
    </OverlayShell>
  )
}
