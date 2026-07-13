export function HeroOverlay() {
  return (
    <div className="text-center px-6">
      <p className="section-label mb-6">SMART TICKETING · FOR ORGANIZERS</p>
      <h1
        className="font-cormorant font-bold text-ivory leading-[0.98]"
        style={{ fontSize: 'clamp(40px, 7vw, 92px)', textShadow: '0 4px 32px rgba(0,0,0,0.85)' }}
      >
        Ticketing built to survive
        <br />
        the <span className="gold-text italic">rush.</span>
      </h1>
      <p className="text-ash text-lg leading-relaxed max-w-xl mx-auto mt-8">
        We design, print and manage your entire ticketing operation &mdash; unique tamper-proof
        QR codes, on-ground distribution stalls, and a real-time scanner that holds up when a
        hundred thousand people show up at once. You run the event; we run the gate.
      </p>
    </div>
  )
}
