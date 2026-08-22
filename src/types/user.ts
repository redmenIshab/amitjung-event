import { z } from 'zod'

/**
 * Roles an admin may assign from the Control Center.
 *
 * `USER` is deliberately absent: it is the default applied to public
 * self-registration and means "no capabilities". Admins grant staff access;
 * to take it away they deactivate the account rather than demote it to USER,
 * so there is exactly one revocation mechanism.
 *
 * `ORGANIZER` is assignable, but on its own it grants nothing — its
 * capabilities apply only to events the account is assigned to on the event
 * page. See src/lib/eventScope.ts.
 */
export const assignableRoles = ['ADMIN', 'MANAGER', 'STAFF', 'ORGANIZER'] as const
export type AssignableRole = (typeof assignableRoles)[number]

/** Min length for admin-set staff passwords (the public sign-up path allows 6). */
export const MIN_STAFF_PASSWORD_LENGTH = 8

export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z
    .string()
    .min(MIN_STAFF_PASSWORD_LENGTH, `Password must be at least ${MIN_STAFF_PASSWORD_LENGTH} characters`)
    .max(200),
  role: z.enum(assignableRoles),
})

/**
 * Name, role and activation are editable. Email is not — it is the login
 * identifier and the credential-email destination. Password is not either, but
 * for a different reason now: it has its own endpoint
 * (POST /api/users/[userId]/password) because a reset also has to stamp the
 * account and evict existing sessions, which a partial update should not do
 * silently as a side effect.
 */
export const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    role: z.enum(assignableRoles).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No changes supplied' })

/**
 * Admin-driven password reset. There is no self-service forgot-password flow,
 * so this is the only way back into a locked-out account.
 *
 * Same minimum as account creation — a reset must not be a way to set a weaker
 * password than the account could have been created with.
 */
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(
      MIN_STAFF_PASSWORD_LENGTH,
      `Password must be at least ${MIN_STAFF_PASSWORD_LENGTH} characters`,
    )
    .max(200),
})

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>

/** Shape returned to the client. Never includes `password`. */
export interface StaffUserDto {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
  /** Events assigned to this account. Undefined when the caller didn't join them. */
  assignedEvents?: number
}
