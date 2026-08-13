import Link from 'next/link'
import { ReactNode } from 'react'

interface ServiceCardProps {
  number: string
  label: string
  title: string
  body: string
  icon: ReactNode
  href?: string
  /** Overrides the gold accent for a sister-brand card (e.g. Software Factory's
   *  dark green). Inline colors are used so they beat `.section-label`'s gold. */
  accent?: { color: string; line: string; tint: string }
  cta?: string
}

export default function ServiceCard({
  number, label, title, body, icon, href = '#contact', accent, cta = 'Learn more →',
}: ServiceCardProps) {
  const external = href.startsWith('http')

  const body_ = (
    <>
      <div
        className={accent ? 'w-8 h-8' : 'text-gold w-8 h-8'}
        style={accent ? { color: accent.color } : undefined}
      >
        {icon}
      </div>
      <div>
        <p className="section-label mb-2" style={accent ? { color: accent.color } : undefined}>
          {number} — {label}
        </p>
        <h3 className="font-dm font-bold text-ivory text-2xl leading-tight mb-3">{title}</h3>
        <p className="text-ash text-sm leading-relaxed">{body}</p>
      </div>
    </>
  )

  const linkClass =
    'text-sm underline underline-offset-4 transition-colors mt-auto ' +
    (accent ? 'hover:opacity-80' : 'text-gold hover:text-gold-light')

  return (
    <div
      className="gold-border rounded-sm p-6 bg-surface flex flex-col gap-4 min-w-[280px] md:min-w-0 transition-all duration-200 hover:-translate-y-1 hover:bg-surface-mid group"
      style={
        accent
          ? {
              borderColor: accent.line,
              backgroundImage: `linear-gradient(160deg, ${accent.tint} 0%, transparent 62%)`,
            }
          : undefined
      }
    >
      {body_}
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
          style={accent ? { color: accent.color } : undefined}
        >
          {cta}
        </a>
      ) : (
        <Link href={href} className={linkClass} style={accent ? { color: accent.color } : undefined}>
          {cta}
        </Link>
      )}
    </div>
  )
}
