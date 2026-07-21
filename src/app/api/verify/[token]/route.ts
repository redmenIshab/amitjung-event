import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { verifyTicket } from '@/lib/verify'

type Params = { params: Promise<{ token: string }> }

export async function POST(_req: Request, { params }: Params) {
  const gate = await requireApiCapability('TICKET_SCAN')
  if (gate instanceof NextResponse) return gate

  const { token } = await params
  const result = await verifyTicket(token)
  const status = result.valid ? 200 : result.reason === 'NOT_FOUND' ? 404 : 200
  return NextResponse.json(result, { status })
}
