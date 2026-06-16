import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { verifyTicket } from '@/lib/verify'

type Params = { params: Promise<{ token: string }> }

// Only authenticated staff/admin scanners may perform check-in.
export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await params
  const result = await verifyTicket(token)
  const status = result.valid ? 200 : result.reason === 'NOT_FOUND' ? 404 : 200
  return NextResponse.json(result, { status })
}
