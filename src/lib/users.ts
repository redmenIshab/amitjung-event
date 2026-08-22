import type { AssignableRole, StaffUserDto } from '@/types/user'

/**
 * Staff account rules — the single source of truth for who may be changed and
 * how. Kept pure (no Prisma, no session) so the API route stays thin and the
 * rules are unit-testable without a database, mirroring how `events.ts`
 * centralises availability rules.
 */

export interface MutableUser {
  id: string
  role: string
  active: boolean
}

export interface UserMutation {
  role?: AssignableRole
  active?: boolean
}

export interface MutationContext {
  /** id of the admin performing the change */
  actorId: string
  target: MutableUser
  change: UserMutation
  /** Active ADMINs *other than* the target. Makes the last-admin test trivial. */
  otherActiveAdmins: number
}

/**
 * Returns a human-readable reason the mutation must be refused, or null when
 * it is allowed.
 *
 * Two classes of rule:
 *  - self-protection: an admin cannot demote or deactivate themselves, which
 *    would drop their own access mid-session.
 *  - last-admin: the final active ADMIN cannot lose admin rights, otherwise
 *    nobody can reach /admin/users again and recovery needs direct DB access.
 */
export function validateUserMutation(ctx: MutationContext): string | null {
  const { actorId, target, change, otherActiveAdmins } = ctx

  const isSelf = actorId === target.id
  const demoting = change.role !== undefined && change.role !== target.role
  const deactivating = change.active === false && target.active

  if (isSelf && demoting) return 'You cannot change your own role.'
  if (isSelf && change.active === false) return 'You cannot deactivate your own account.'

  const isLastAdmin = target.role === 'ADMIN' && target.active && otherActiveAdmins === 0
  if (isLastAdmin && demoting) {
    return 'This is the last active admin. Promote another admin before changing this role.'
  }
  if (isLastAdmin && deactivating) {
    return 'This is the last active admin. Promote another admin before deactivating this account.'
  }

  return null
}

/** Serialises a user row for the client. Exists to guarantee `password` never leaks. */
export function toStaffUserDto(row: {
  id: string
  name: string
  email: string
  role: string
  deletedAt: Date | null
  createdAt: Date
  /**
   * Number of events this account is assigned to. Optional because most call
   * sites do not join the assignments; where it IS supplied, the staff
   * directory uses it to show that an ORGANIZER with zero events holds no
   * access at all.
   */
  _count?: { assignments: number }
}): StaffUserDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.deletedAt === null,
    createdAt: row.createdAt.toISOString(),
    assignedEvents: row._count?.assignments,
  }
}
