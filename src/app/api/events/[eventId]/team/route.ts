import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { toStaffUserDto } from '@/lib/users'
import { addTeamMemberSchema } from '@/types/team'
import { isEmailEnabled, sendStaffCredentialsEmail } from '@/lib/email'

type Params = { params: Promise<{ eventId: string }> }

/** Columns safe to return. Explicit so the password hash can never leak. */
const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  deletedAt: true,
  createdAt: true,
} as const

export async function GET(_request: Request, { params }: Params) {
  const gate = await requireApiCapability('USER_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { eventId } = await params
  const rows = await prisma.eventAssignment.findMany({
    where: { eventId },
    select: { user: { select: SAFE_SELECT } },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(rows.map((r) => toStaffUserDto(r.user)))
}

/**
 * Adds someone to the event's organizer team — either an existing account or a
 * brand-new ORGANIZER login created here, because "add a team member" is one
 * action from the admin's side.
 */
export async function POST(request: Request, { params }: Params) {
  const gate = await requireApiCapability('USER_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { eventId } = await params
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })
  if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const parsed = addTeamMemberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  let user
  let plainPassword: string | undefined

  if ('userId' in parsed.data) {
    user = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: SAFE_SELECT,
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  } else {
    const { name, email, password } = parsed.data
    plainPassword = password
    try {
      user = await prisma.user.create({
        data: { name, email, password: await bcrypt.hash(password, 12), role: 'ORGANIZER' },
        select: SAFE_SELECT,
      })
    } catch (e) {
      // P2002 = unique constraint. Relying on the DB rather than a prior
      // findUnique keeps this race-free under concurrent submits.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
      }
      throw e
    }
  }

  try {
    await prisma.eventAssignment.create({ data: { userId: user.id, eventId } })
  } catch (e) {
    // Already on the team — treat as success so a double submit is harmless.
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')) throw e
  }

  // Delivery is best-effort: the account and assignment already exist, so a
  // mail failure must not fail the request. When mail does not go out we hand
  // the password back so the admin can pass it on — otherwise it would be
  // unrecoverable, matching POST /api/users.
  let emailSent = false
  if (plainPassword && isEmailEnabled()) {
    try {
      await sendStaffCredentialsEmail({
        to: user.email,
        name: user.name,
        role: user.role,
        password: plainPassword,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin/login`,
      })
      emailSent = true
    } catch (err) {
      console.error('Organizer credentials email failed:', err)
    }
  }

  return NextResponse.json(
    {
      user: toStaffUserDto(user),
      emailSent,
      password: emailSent ? undefined : plainPassword,
    },
    { status: 201 },
  )
}
