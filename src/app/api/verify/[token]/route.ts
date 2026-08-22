import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { visibleEventIds } from '@/lib/eventAccess'
import { verifyTicket } from '@/lib/verify'

type Params = { params: Promise<{ token: string }> }

export async function POST(_req: Request, { params }: Params) {
  const gate = await requireApiCapability('TICKET_SCAN')
  if (gate instanceof NextResponse) return gate

  // null for ADMIN/STAFF — scan anything. An organizer is confined to their
  // assigned events, re-read from the database rather than from the token.
  const allowed = await visibleEventIds(gate.session)

  const { token } = await params
  const result = await verifyTicket(token, allowed)
  const status = result.valid ? 200 : result.reason === 'NOT_FOUND' ? 404 : 200
  return NextResponse.json(result, { status })
}
