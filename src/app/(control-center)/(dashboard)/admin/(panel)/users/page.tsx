import { requirePageCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { toStaffUserDto } from '@/lib/users'
import { UsersTable } from '@/components/dashboard/UsersTable'

/**
 * Staff directory. The (panel) layout only guarantees DASHBOARD_VIEW, so this
 * page gates on USER_MANAGE itself — otherwise STAFF could reach it by typing
 * the URL even though the nav link is hidden from them.
 */
export default async function UsersPage() {
  const session = await requirePageCapability('USER_MANAGE')

  // Read the DB directly: admin pages bypass the cache, and a server component
  // must never self-fetch its own API (ARCHITECTURE §11, landmine #2).
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, deletedAt: true, createdAt: true },
    orderBy: [{ deletedAt: 'asc' }, { createdAt: 'desc' }],
  })

  return <UsersTable initialUsers={users.map(toStaffUserDto)} currentUserId={session.user.id} />
}
