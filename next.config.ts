import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Prevent these server-only packages from being bundled by the Next.js
  // client bundler — they run only in Node.js (API routes / Server Components).
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs', 'cloudinary'],

  // Marketing media is served from Cloudinary. Required, not cosmetic: the
  // gallery components (WorkTile, Lightbox, Hero, Portfolio) render next/image
  // WITHOUT `unoptimized`, and the optimiser refuses any remote host that is
  // not allowlisted here.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' }],
  },

  // /work became /about (the work gallery now lives under the About Us page).
  // Kept permanent so old inbound links and indexed URLs still land.
  async redirects() {
    return [{ source: '/work', destination: '/about', permanent: true }]
  },

  /**
   * Baseline security headers. There were none, so the site shipped without
   * clickjacking, MIME-sniffing or referrer protection.
   *
   * Deliberately NOT setting Content-Security-Policy here: the app relies on
   * inline styles and Next's inline bootstrap script, so a CSP needs a nonce
   * wired through the proxy to avoid breaking rendering. That is worth doing,
   * but as its own change with its own testing rather than bundled into a
   * performance pass.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Browsers reach the site over HTTPS only. Two years, subdomains
          // included — amit.lyante.art is ours too.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // Tickets carry QR codes and personal data; framing them elsewhere
          // enables clickjacking against the account area.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Send the origin cross-site, never the full path: ticket URLs
          // contain the token that identifies the ticket.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // The app asks for the camera on the scanner page only; nothing
          // needs microphone, geolocation or payment autofill.
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), payment=()',
          },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ]
  },
}

export default nextConfig
