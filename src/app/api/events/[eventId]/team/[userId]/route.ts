import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

type Params = { params: Promise<{ eventId: string; userId: string }> }

/**
 * Removes one member's access to one event. `deleteMany` rather than `delete`
 * so removing an assignment that is already gone is a no-op, not a 500.
 *
 * The account itself is left alone — deactivating staff is a separate action
 * with its own rules (src/lib/users.ts).
 */
export async function DELETE(_request: Request, { params }: Params) {
  const gate = await requireApiCapability('USER_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { eventId, userId } = await params
  await prisma.eventAssignment.deleteMany({ where: { userId, eventId } })

  return new NextResponse(null, { status: 204 })
}
