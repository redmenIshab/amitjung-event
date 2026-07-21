import type { Session } from 'next-auth'
import { getServerSession } from 'next-auth/next'
import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'

export type AppRole = Session['user']['role']

export const CAPABILITY = {
  DASHBOARD_VIEW: ['ADMIN', 'STAFF', 'MANAGER'],
  ANALYTICS_READ: ['ADMIN', 'STAFF', 'MANAGER'],
  TICKET_SCAN: ['ADMIN', 'STAFF'],
  EVENT_WRITE: ['ADMIN'],
  TICKET_MANAGE: ['ADMIN'],
  ARTIST_MANAGE: ['ADMIN'],
  MARKETING_MANAGE: ['ADMIN', 'MANAGER'],
  USER_MANAGE: ['ADMIN'],
} as const satisfies Record<string, readonly AppRole[]>

export type Capability = keyof typeof CAPABILITY

export function hasCapability(role: AppRole | undefined, cap: Capability): boolean {
  return role !== undefined && (CAPABILITY[cap] as readonly AppRole[]).includes(role)
}

export async function requireApiCapability(
  cap: Capability,
): Promise<{ session: Session } | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasCapability(session.user.role, cap))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return { session }
}

export async function requirePageCapability(cap: Capability): Promise<Session> {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!hasCapability(session.user.role, cap)) redirect('/')
  return session
}

export async function requireSession(): Promise<{ session: Session } | NextResponse> {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return { session }
}
