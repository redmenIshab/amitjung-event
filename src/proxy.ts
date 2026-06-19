import { getToken } from 'next-auth/jwt'
import { NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/dashboard') || pathname === '/scanner') {
    if (!token || token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  if (['/', '/work', '/ticketing', '/branding', '/contact'].includes(pathname)) {
    if (!token || token.role !== 'MANAGER') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard',
    '/scanner',
    '/work',
    '/ticketing',
    '/branding',
    '/contact',
  ],
}
