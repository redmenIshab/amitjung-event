import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { toStaffUserDto } from '@/lib/users'
import { createUserSchema } from '@/types/user'
import { isEmailEnabled, sendStaffCredentialsEmail } from '@/lib/email'

/** Columns safe to return. Explicit so the password hash can never leak. */
const SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  deletedAt: true,
  createdAt: true,
} as const

export async function GET() {
  const gate = await requireApiCapability('USER_MANAGE')
  if (gate instanceof NextResponse) return gate

  const users = await prisma.user.findMany({
    select: SAFE_SELECT,
    orderBy: [{ deletedAt: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(users.map(toStaffUserDto))
}

export async function POST(request: Request) {
  const gate = await requireApiCapability('USER_MANAGE')
  if (gate instanceof NextResponse) return gate

  const body = await request.json()
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { name, email, password, role } = parsed.data
  const hashed = await bcrypt.hash(password, 12)

  let created
  try {
    created = await prisma.user.create({
      data: { name, email, password: hashed, role },
      select: SAFE_SELECT,
    })
  } catch (e) {
    // P2002 = unique constraint. Relying on the DB rather than a prior findUnique
    // keeps this race-free under concurrent submits.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    throw e
  }

  // Delivery is best-effort: the account already exists, so a mail failure must
  // not fail the request. When mail does not go out we hand the password back
  // so the admin can pass it on — otherwise it would be unrecoverable.
  let emailSent = false
  if (isEmailEnabled()) {
    try {
      await sendStaffCredentialsEmail({
        to: email,
        name,
        role,
        password,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin/login`,
      })
      emailSent = true
    } catch (err) {
      console.error('Staff credentials email failed:', err)
    }
  }

  return NextResponse.json(
    {
      user: toStaffUserDto(created),
      emailSent,
      password: emailSent ? undefined : password,
    },
    { status: 201 },
  )
}
