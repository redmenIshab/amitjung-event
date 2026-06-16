interface TestimonialCardProps {
  quote: string
  name: string
  event: string
}

export default function TestimonialCard({ quote, name, event }: TestimonialCardProps) {
  return (
    <div className="relative gold-border rounded-sm p-8 bg-surface min-w-[320px] md:min-w-[440px] shrink-0">
      <span
        className="absolute top-2 left-6 font-cormorant text-gold opacity-30 leading-none select-none pointer-events-none"
        style={{ fontSize: '120px' }}
        aria-hidden="true"
      >
        &ldquo;
      </span>
      <p className="font-dm text-ivory text-base leading-relaxed relative z-10 mb-6">{quote}</p>
      <div>
        <p className="text-ivory text-sm font-medium">{name}</p>
        <p className="text-ash text-xs mt-1">{event}</p>
      </div>
    </div>
  )
}
