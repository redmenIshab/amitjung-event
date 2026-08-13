import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Prevent these server-only packages from being bundled by the Next.js
  // client bundler — they run only in Node.js (API routes / Server Components).
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs'],

  // /work became /about (the work gallery now lives under the About Us page).
  // Kept permanent so old inbound links and indexed URLs still land.
  async redirects() {
    return [{ source: '/work', destination: '/about', permanent: true }]
  },
}

export default nextConfig
