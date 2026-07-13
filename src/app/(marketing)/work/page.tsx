import Link from 'next/link'
import WhyWorkWithUs from '@/components/marketing/sections/WhyWorkWithUs'
import { WorkGallery } from '@/components/marketing/work/WorkGallery'

export const metadata = { title: 'Work — Lyante Production' }

export default function WorkPage() {
  return (
    <>
      <div className="pt-24" />
      <WhyWorkWithUs />
      <WorkGallery />
      <div className="py-8 px-4 md:px-20 text-center">
        <Link href="/" className="text-gold text-sm hover:underline">← Back to Home</Link>
      </div>
    </>
  )
}
