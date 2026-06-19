import { z } from 'zod'

export const createEventSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  venue: z.string().min(1, 'Venue is required').max(200),
  date: z.string().datetime({ message: 'Invalid date format' }),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
  baseTicketPrice: z.number().int().min(0, 'Price must be non-negative'),
  hasDiscount: z.boolean().optional().default(false),
  discountPercentage: z.number().int().min(0).max(100).optional().default(0),
  discountUpto: z.string().datetime().optional(),
  description: z.string().max(1000).optional(),
  isOpen: z.boolean().optional().default(true),
  image: z.string().url().optional().or(z.literal('')),
  genres: z.array(z.string()).default([]),
  artistId: z.string().optional(),
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

export const ticketEventIdSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
})

export const ticketDetailIdSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  ticketId: z.string().min(1, 'ticketId is required'),
})

// ── Response schemas for client-side validation ──

export const ticketsMineResponseSchema = z.object({
  groups: z.array(z.object({
    event: z.object({
      id: z.string(),
      name: z.string(),
      venue: z.string(),
      bookingDeadline: z.string(),
      image: z.string().nullable(),
    }),
    count: z.number(),
  })),
})

export const eventTicketsResponseSchema = z.object({
  event: z.object({
    id: z.string(),
    name: z.string(),
    venue: z.string(),
    bookingDeadline: z.string(),
    image: z.string().nullable(),
    description: z.string().nullable(),
  }),
  tickets: z.array(z.object({
    id: z.string(),
    token: z.string(),
    attendeeName: z.string().nullable(),
    attendeeEmail: z.string().nullable(),
    category: z.enum(['GENERAL', 'VIP']),
    status: z.enum(['UNUSED', 'USED', 'CANCELLED']),
    source: z.string(),
    qrDataUrl: z.string(),
  })),
})

export const ticketDetailResponseSchema = z.object({
  id: z.string(),
  token: z.string(),
  attendeeName: z.string().nullable(),
  attendeeEmail: z.string().nullable(),
  distributorName: z.string().nullable(),
  category: z.enum(['GENERAL', 'VIP']),
  status: z.enum(['UNUSED', 'USED', 'CANCELLED']),
  source: z.string(),
  qrDataUrl: z.string(),
  event: z.object({
    id: z.string(),
    name: z.string(),
    venue: z.string(),
    bookingDeadline: z.string(),
    image: z.string().nullable(),
    description: z.string().nullable(),
  }),
  checkIn: z.object({ scannedAt: z.string() }).nullable(),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type GenerateTicketInput = z.infer<typeof generateTicketSchema>
export type BulkGenerateTicketInput = z.infer<typeof bulkGenerateTicketSchema>
export type DistributorTicketInput = z.infer<typeof distributorTicketSchema>
export type RegisterInput = z.infer<typeof registerSchema>
