import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'
import { hasCapability } from '@/lib/rbac'

export async function proxy(request: NextRequest) {
  // The admin login page must stay public, otherwise the guard loops on it.
  if (request.nextUrl.pathname === '/admin/login') {
    return NextResponse.next()
  }
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  // JWT.role is typed as AppRole in next-auth.d.ts — no cast needed.
  if (!token || !hasCapability(token.role, 'DASHBOARD_VIEW')) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
