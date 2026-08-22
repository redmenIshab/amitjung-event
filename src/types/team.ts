import { z } from 'zod'
import { MIN_STAFF_PASSWORD_LENGTH } from '@/types/user'

/**
 * Adding someone to an event's organizer team is either "assign this existing
 * account" or "create an organizer login and assign it". One endpoint, because
 * from the admin's point of view it is one action.
 */
export const addTeamMemberSchema = z.union([
  z.object({ userId: z.string().min(1) }),
  z.object({
    name: z.string().trim().min(1, 'Name is required').max(200),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: z
      .string()
      .min(
        MIN_STAFF_PASSWORD_LENGTH,
        `Password must be at least ${MIN_STAFF_PASSWORD_LENGTH} characters`,
      )
      .max(200),
  }),
])

export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>
