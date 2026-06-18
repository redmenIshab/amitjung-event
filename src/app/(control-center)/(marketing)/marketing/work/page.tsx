import Portfolio from '@/components/marketing/sections/Portfolio'
import Link from 'next/link'

export const metadata = { title: 'Work — Lyante Production' }

export default function WorkPage() {
  return (
    <>
      <div className="pt-24" />
      <Portfolio />
      <div className="py-8 px-4 md:px-20 text-center">
        <Link href="/" className="text-gold text-sm hover:underline">← Back to Home</Link>
      </div>
    </>
  )
}
