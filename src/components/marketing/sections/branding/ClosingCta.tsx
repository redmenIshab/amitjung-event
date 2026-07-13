import Link from 'next/link'
import Button from '@/components/marketing/ui/Button'

export default function ClosingCta() {
  return (
    <section className="py-24 md:py-32 px-4 md:px-20 bg-bg text-center">
      <div className="max-w-3xl mx-auto">
        <p className="section-label mb-4">LET&rsquo;S BUILD</p>
        <h2
          className="font-cormorant font-bold text-ivory mb-6 leading-tight"
          style={{ fontSize: 'var(--t-display)' }}
        >
          Ready to become unforgettable?
        </h2>
        <p className="text-ash text-lg leading-relaxed mb-10">
          Tell us about your brand and where you want it to go. We&rsquo;ll show you exactly how
          we&rsquo;d get you there.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Button href="/contact" variant="gold">
            BRIEF US →
          </Button>
          <Button href="/work" variant="outline">
            SEE OUR WORK
          </Button>
        </div>
        <div className="mt-12">
          <Link href="/" className="text-gold text-sm hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </section>
  )
}
