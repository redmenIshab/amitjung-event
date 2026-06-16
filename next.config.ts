import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Prevent these server-only packages from being bundled by the Next.js
  // client bundler — they run only in Node.js (API routes / Server Components).
  serverExternalPackages: ['@prisma/client', 'prisma', 'bcryptjs'],
}

export default nextConfig
