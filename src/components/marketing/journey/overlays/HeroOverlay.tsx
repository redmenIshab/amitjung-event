export function HeroOverlay() {
  return (
    <div className="text-center px-6">
      <p className="section-label mb-6">CREATIVE &amp; BRANDING</p>
      <h1
        className="font-cormorant font-bold text-ivory leading-[0.95]"
        style={{ fontSize: 'clamp(44px, 8vw, 104px)', textShadow: '0 4px 32px rgba(0,0,0,0.8)' }}
      >
        We don&rsquo;t just create.
        <br />
        We build brands that feel
        <br />
        <span className="gold-text italic">unforgettable.</span>
      </h1>
      <p className="text-ash text-lg leading-relaxed max-w-2xl mx-auto mt-8">
        Everything your brand needs to exist, grow and stay unmistakable &mdash; from the very
        first sketch of your identity to the paid campaigns that keep the room talking. One team,
        the whole journey.
      </p>
    </div>
  )
}
