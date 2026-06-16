import type { Metadata } from 'next'
import {
  Cormorant_Garamond,
  Bebas_Neue,
  DM_Sans,
  DM_Mono,
} from 'next/font/google'
import Nav from '@/components/marketing/layout/Nav'
import Footer from '@/components/marketing/layout/Footer'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})
const bebas = Bebas_Neue({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-bebas',
  display: 'swap',
})
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-dm-sans',
  display: 'swap',
})
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Lyante Production — We Bring Events to Life',
  description:
    "Nepal's premier creative event production company. Pre-production, live coverage, post-production, smart ticketing, and lifetime event documentation.",
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`${cormorant.variable} ${bebas.variable} ${dmSans.variable} ${dmMono.variable}`}
      style={{ backgroundColor: '#080808', color: '#F0EDE6', minHeight: '100vh' }}
    >
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  )
}
