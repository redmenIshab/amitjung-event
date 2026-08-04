import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { toStaffUserDto, validateUserMutation } from '@/lib/users'
import { updateUserSchema } from '@/types/user'

const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  deletedAt: true,
  createdAt: true,
} as const

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const gate = await requireApiCapability('USER_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { userId } = await params
  const user = await prisma.user.findUnique({ where: { id: userId }, select: SAFE_SELECT })
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(toStaffUserDto(user))
}

/** Updates name / role / activation. Guarded against self-lockout and last-admin removal. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const gate = await requireApiCapability('USER_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { userId } = await params
  const body = await request.json()
  const parsed = updateUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: SAFE_SELECT })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Counted excluding the target so the last-admin rule reads simply.
  const otherActiveAdmins = await prisma.user.count({
    where: { role: 'ADMIN', deletedAt: null, id: { not: userId } },
  })

  const refusal = validateUserMutation({
    actorId: gate.session.user.id,
    target: { id: target.id, role: target.role, active: target.deletedAt === null },
    change: parsed.data,
    otherActiveAdmins,
  })
  if (refusal) return NextResponse.json({ error: refusal }, { status: 409 })

  const { name, role, active } = parsed.data
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(active !== undefined && { deletedAt: active ? null : new Date() }),
    },
    select: SAFE_SELECT,
  })

  return NextResponse.json(toStaffUserDto(updated))
}
