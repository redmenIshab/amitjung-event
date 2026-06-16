import Link from 'next/link'
import Logo from '@/components/marketing/ui/Logo'

const FOOTER_LINKS = {
  SERVICES: [
    { label: 'Production', href: '/ticketing' },
    { label: 'Ticketing', href: '/ticketing' },
    { label: 'Branding', href: '/branding' },
  ],
  COMPANY: [
    { label: 'About', href: '/#about' },
    { label: 'Work', href: '/work' },
    { label: 'Contact', href: '/contact' },
  ],
}

const SOCIALS = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/lyanteprod/',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@lyanteprod',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.93a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1-.31z" />
      </svg>
    ),
  },
]

export default function Footer() {
  return (
    <footer className="bg-[#040404] border-t border-gold/20 pt-16 pb-8 px-4 md:px-20">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          {/* Brand column */}
          <div className="md:col-span-1">
            <Logo variant="white" height={40} className="mb-4" />
            <p className="font-bebas text-2xl tracking-widest text-ivory mt-2">LYANTE</p>
            <p className="text-ash text-sm mt-1 leading-relaxed">
              Creative Event Production<br />Kathmandu, Nepal
            </p>

            {/* Social icons */}
            <div className="flex gap-3 mt-6">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-full border border-coal hover:border-gold text-ash hover:text-gold flex items-center justify-center transition-all duration-200"
                >
                  {s.icon}
                </a>
              ))}
              <a
                href="mailto:lyanteprod@gmail.com"
                aria-label="Email"
                className="w-8 h-8 rounded-full border border-coal hover:border-gold text-ash hover:text-gold flex items-center justify-center transition-all duration-200"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
                  <rect x="2" y="4" width="16" height="12" rx="2" />
                  <path d="M2 7l8 5 8-5" />
                </svg>
              </a>
            </div>
          </div>

          {/* Nav link columns */}
          {(Object.entries(FOOTER_LINKS) as [string, { label: string; href: string }[]][]).map(
            ([col, links]) => (
              <div key={col}>
                <p className="section-label mb-6">{col}</p>
                <ul className="flex flex-col gap-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-ash hover:text-gold transition-colors text-sm"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}

          {/* Contact column */}
          <div>
            <p className="section-label mb-6">CONTACT</p>
            <ul className="flex flex-col gap-3">
              <li>
                <a
                  href="mailto:lyanteprod@gmail.com"
                  className="text-ash hover:text-gold transition-colors text-sm"
                >
                  lyanteprod@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://www.instagram.com/lyanteprod/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ash hover:text-gold transition-colors text-sm"
                >
                  Instagram · @lyanteprod
                </a>
              </li>
              <li>
                <a
                  href="https://www.tiktok.com/@lyanteprod"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ash hover:text-gold transition-colors text-sm"
                >
                  TikTok · @lyanteprod
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-coal/40 pt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-coal text-xs">
            © {new Date().getFullYear()} Lyante Production. All rights reserved.
          </p>
          <p className="text-coal text-xs">
            A production of{' '}
            <span className="text-ash">Software Factory Pvt. Ltd.</span>
            {' '}· Reg. No. 263452, Nepal OCR 2021
          </p>
        </div>
      </div>
    </footer>
  )
}
