import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { resetPasswordSchema } from '@/types/user'
import { isEmailEnabled, sendStaffCredentialsEmail } from '@/lib/email'
import { rateLimit } from '@/lib/rateLimit'

type Params = { params: Promise<{ userId: string }> }

/**
 * Reset a staff account's password.
 *
 * There is no self-service forgot-password flow, so this is the only way back
 * into a locked-out account — which is exactly why it is ADMIN-only and why it
 * stamps `passwordChangedAt`: with JWT sessions, changing the hash alone would
 * leave anyone already signed in on that account still signed in.
 */
export async function POST(request: Request, { params }: Params) {
  const gate = await requireApiCapability('USER_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { userId } = await params

  // An admin account is the one that can reset every other account, so a
  // compromised admin session is worth slowing down.
  const limit = await rateLimit({
    key: `password-reset:${gate.session.user.id}`,
    limit: 10,
    windowSeconds: 300,
  })
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many password resets. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  const body = await request.json().catch(() => ({}))
  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  })
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { password } = parsed.data

  await prisma.user.update({
    where: { id: userId },
    data: {
      password: await bcrypt.hash(password, 12),
      // Stamped in the same write as the hash: the two must never disagree, or
      // a session would survive a credential it no longer matches.
      passwordChangedAt: new Date(),
    },
  })

  // Best-effort, exactly as account creation is: the password is already
  // changed, so a mail failure must not fail the request. When mail is off we
  // hand it back once so the admin can pass it on — there is no other way to
  // recover it.
  let emailSent = false
  if (isEmailEnabled()) {
    try {
      await sendStaffCredentialsEmail({
        to: target.email,
        name: target.name,
        role: target.role,
        password,
        loginUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/admin/login`,
      })
      emailSent = true
    } catch (err) {
      console.error('Password reset email failed:', err)
    }
  }

  return NextResponse.json({
    emailSent,
    password: emailSent ? undefined : password,
    // True whenever the admin reset their own password: their current session
    // was minted before the stamp, so it is now stale like any other.
    signedOutSelf: gate.session.user.id === userId,
  })
}
