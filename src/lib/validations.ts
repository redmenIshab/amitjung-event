import { z } from 'zod'

export const createEventSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  venue: z.string().min(1, 'Venue is required').max(200),
  date: z.string().datetime({ message: 'Invalid date format' }),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
  description: z.string().max(1000).optional(),
  isOpen: z.boolean().optional().default(true),
})

export const updateEventSchema = createEventSchema.partial()

export const ticketCategorySchema = z.enum(['GENERAL', 'VIP'])

export const generateTicketSchema = z.object({
  attendeeName: z.string().min(1, 'Attendee name is required').max(200),
  attendeeEmail: z.string().email('Invalid email address'),
  category: ticketCategorySchema.optional().default('GENERAL'),
})

export const distributorTicketSchema = z.object({
  distributorName: z.string().min(1, 'Distributor name is required').max(200),
  quantity: z.number().int().min(1).max(500),
  category: ticketCategorySchema.default('GENERAL'),
})

export const bulkGenerateTicketSchema = z.object({
  tickets: z
    .array(
      z.object({
        attendeeName: z.string().min(1, 'Attendee name is required').max(200),
        attendeeEmail: z.string().email('Invalid email address'),
      }),
    )
    .min(1, 'At least one ticket is required')
    .max(200, 'Maximum 200 tickets per batch'),
})

export const registerSchema = z.object({
  attendeeName: z.string().min(1, 'Name is required').max(200),
  attendeeEmail: z.string().email('Invalid email address'),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type GenerateTicketInput = z.infer<typeof generateTicketSchema>
export type BulkGenerateTicketInput = z.infer<typeof bulkGenerateTicketSchema>
export type DistributorTicketInput = z.infer<typeof distributorTicketSchema>
export type RegisterInput = z.infer<typeof registerSchema>
