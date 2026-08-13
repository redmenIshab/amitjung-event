import Link from 'next/link'
import VenturesHero from '@/components/marketing/about/VenturesHero'
import WhyWorkWithUs from '@/components/marketing/sections/WhyWorkWithUs'
import { WorkGallery } from '@/components/marketing/work/WorkGallery'

export const metadata = { title: 'About Us — Lyante Production' }

export default function AboutPage() {
  return (
    <>
      <VenturesHero />
      <WhyWorkWithUs />
      <WorkGallery />
      <div className="py-8 px-4 md:px-20 text-center">
        <Link href="/" className="text-gold text-sm hover:underline">← Back to Home</Link>
      </div>
    </>
  )
}
