import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: 'Amit Jung — Official | Bookings & Music',
  description:
    'Amit Jung — Nepali singer-songwriter. Debut album मेरो देश को कथा (2026). Listen, watch, and book him for your event. Managed by Lyante Production.',
  openGraph: {
    title: 'Amit Jung — Official',
    description:
      'Nepali singer-songwriter. Debut album मेरो देश को कथा (2026). Book for live events.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0908',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,400;0,600;0,900;1,300&family=Inter:wght@400;500;600&family=Yatra+One&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
