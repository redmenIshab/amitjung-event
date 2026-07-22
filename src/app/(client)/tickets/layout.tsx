import { Cormorant_Garamond, Bebas_Neue, DM_Sans } from 'next/font/google'
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

export default function TicketsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${cormorant.variable} ${bebas.variable} ${dmSans.variable} relative isolate min-h-screen bg-lyante-bg text-ivory font-dm-sans`}
    >
      {/* Subtle Lyante brand glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-[20%] right-[-10%] w-[70vw] h-[70vw] rounded-full blur-[140px] opacity-[0.08]"
          style={{ background: 'radial-gradient(circle, #c8922a, transparent 60%)' }}
        />
        <div
          className="absolute bottom-[-20%] left-[-15%] w-[55vw] h-[55vw] rounded-full blur-[160px] opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #8b5e10, transparent 60%)' }}
        />
      </div>

      <Nav />
      <div className="min-h-screen pt-16 md:pt-20">{children}</div>
      <Footer />
    </div>
  )
}
