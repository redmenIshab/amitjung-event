import Link from 'next/link'
import { ReactNode } from 'react'

interface ButtonProps {
  children: ReactNode
  href?: string
  onClick?: () => void
  variant?: 'gold' | 'outline'
  className?: string
  type?: 'button' | 'submit'
}

export default function Button({
  children,
  href,
  onClick,
  variant = 'outline',
  className = '',
  type = 'button',
}: ButtonProps) {
  const base =
    'inline-flex items-center gap-2 px-6 py-3 font-bebas text-sm tracking-widest uppercase transition-all duration-250 min-h-[48px]'
  const styles = {
    outline: 'border border-gold text-gold hover:bg-gold hover:text-bg',
    gold: 'bg-gold text-bg hover:opacity-90',
  }
  const cls = `${base} ${styles[variant]} ${className}`

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  )
}
