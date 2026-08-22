import { notFound } from 'next/navigation'
import { requirePageCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { toStaffUserDto } from '@/lib/users'
import { EditUserForm } from '@/components/dashboard/EditUserForm'
import { ResetPasswordCard } from '@/components/dashboard/ResetPasswordCard'

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const session = await requirePageCapability('USER_MANAGE')
  const { userId } = await params

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, deletedAt: true, createdAt: true },
  })
  if (!user) notFound()

  // Whether this is the final admin decides which controls are disabled up
  // front; the API re-checks it, so the UI hint cannot be used to bypass it.
  const otherActiveAdmins = await prisma.user.count({
    where: { role: 'ADMIN', deletedAt: null, id: { not: userId } },
  })

  const isSelf = user.id === session.user.id

  return (
    <div className="space-y-6">
      <EditUserForm
        user={toStaffUserDto(user)}
        isSelf={isSelf}
        isLastAdmin={user.role === 'ADMIN' && user.deletedAt === null && otherActiveAdmins === 0}
      />
      {/* Separate from the details form on purpose: a reset ends the account's
          sessions, which should never ride along with a name change. */}
      <div className="max-w-xl">
        <ResetPasswordCard userId={user.id} userName={user.name} isSelf={isSelf} />
      </div>
    </div>
  )
}
