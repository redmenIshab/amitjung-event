'use client'

import { useEffect, useState } from 'react'
import Button from '@/components/marketing/ui/Button'

const WORDS = ['unforgettable', 'everywhere', 'magnetic', 'iconic', 'yours']

export default function BrandingHero() {
  const [i, setI] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % WORDS.length), 2200)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-bg px-4 md:px-20">
      {/* Dotted grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(200,146,42,0.25) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)',
        }}
      />
      {/* Ghost word */}
      <span
        aria-hidden
        className="pointer-events-none select-none absolute -bottom-6 md:-bottom-16 left-0 right-0 text-center font-bebas leading-none text-coal/20"
        style={{ fontSize: 'clamp(120px, 28vw, 420px)' }}
      >
        BRAND
      </span>

      <div className="relative z-10 max-w-[1400px] mx-auto w-full pt-28 pb-20">
        <p className="section-label mb-6">CREATIVE &amp; BRANDING</p>

        <h1
          className="font-cormorant font-bold text-ivory leading-[0.95]"
          style={{ fontSize: 'clamp(44px, 8vw, 104px)' }}
        >
          We don&rsquo;t just create.
          <br />
          We build brands that feel
        </h1>

        {/* Stop-motion rotating word */}
        <div
          className="relative mt-1 mb-10 leading-[1.25] pb-[0.2em] overflow-visible"
          style={{ fontSize: 'clamp(44px, 8vw, 104px)' }}
        >
          <span
            key={i}
            className="gold-text font-cormorant font-bold italic inline-block leading-[1.25]"
            style={{ animation: 'smWord 520ms steps(5, end) both' }}
          >
            {WORDS[i]}.
          </span>
        </div>

        <p className="text-ash text-lg leading-relaxed max-w-2xl mb-10">
          Everything your brand needs to exist, grow and stay unmistakable &mdash; from the very
          first sketch of your identity to the paid campaigns that keep the room talking. One team,
          the whole journey.
        </p>

        <div className="flex flex-wrap gap-4">
          <Button href="/contact" variant="gold">
            BRIEF US →
          </Button>
          <Button href="#deliverables" variant="outline">
            SEE WHAT YOU GET
          </Button>
        </div>
      </div>

      {/* Scroll cue */}
      <div
        aria-hidden
        className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ animation: 'floatCue 2.2s ease-in-out infinite' }}
      >
        <span className="font-dm-mono text-[11px] tracking-[0.3em] text-gold/60 uppercase">Scroll</span>
        <div className="w-[1px] h-8 bg-gradient-to-b from-gold/60 to-transparent" />
      </div>

      <style>{`
        @keyframes smWord {
          0%   { opacity: 0; transform: translateY(0.35em) rotate(-3deg) scale(0.94); }
          100% { opacity: 1; transform: translateY(0) rotate(0deg) scale(1); }
        }
        @keyframes floatCue {
          0%, 100% { transform: translate(-50%, 0); opacity: 0.7; }
          50%      { transform: translate(-50%, 6px); opacity: 1; }
        }
      `}</style>
    </section>
  )
}
