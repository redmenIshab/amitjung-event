import Link from 'next/link'

export const metadata = { title: 'Branding — Lyante Production' }

export default function BrandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 pt-24 px-4">
      <p className="section-label">COMING SOON</p>
      <h1 className="font-cormorant font-bold text-ivory text-5xl text-center">
        Creative &amp; Branding
      </h1>
      <p className="text-ash text-center max-w-md">
        Our branding portfolio is being prepared. Reach out to discuss your project.
      </p>
      <Link href="/contact" className="text-gold underline underline-offset-4 hover:text-gold-light">
        Brief Us →
      </Link>
    </div>
  )
}
