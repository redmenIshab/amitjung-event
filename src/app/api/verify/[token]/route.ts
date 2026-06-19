import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { verifyTicket } from '@/lib/verify'

type Params = { params: Promise<{ token: string }> }

const SCANNER_ROLES = ['ADMIN', 'STAFF'] as const

export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || !SCANNER_ROLES.includes(session.user.role as typeof SCANNER_ROLES[number])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { token } = await params
  const result = await verifyTicket(token)
  const status = result.valid ? 200 : result.reason === 'NOT_FOUND' ? 404 : 200
  return NextResponse.json(result, { status })
}
