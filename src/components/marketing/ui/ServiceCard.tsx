import Link from 'next/link'
import { ReactNode } from 'react'

interface ServiceCardProps {
  number: string
  label: string
  title: string
  body: string
  icon: ReactNode
  href?: string
}

export default function ServiceCard({ number, label, title, body, icon, href = '#contact' }: ServiceCardProps) {
  return (
    <div className="gold-border rounded-sm p-6 bg-surface flex flex-col gap-4 min-w-[280px] md:min-w-0 transition-all duration-200 hover:-translate-y-1 hover:bg-surface-mid group">
      <div className="text-gold w-8 h-8">{icon}</div>
      <div>
        <p className="section-label mb-2">{number} — {label}</p>
        <h3 className="font-dm font-bold text-ivory text-2xl leading-tight mb-3">{title}</h3>
        <p className="text-ash text-sm leading-relaxed">{body}</p>
      </div>
      <Link href={href} className="text-gold text-sm underline underline-offset-4 hover:text-gold-light transition-colors mt-auto">
        Learn more →
      </Link>
    </div>
  )
}
