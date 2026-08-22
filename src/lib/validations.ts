import { z } from 'zod'
import { isCompletableDate } from '@/lib/events'
import { mediaRefSchema } from '@/lib/media'

export const eventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'])
export const eventTypeSchema = z.enum([
  'CONCERT',
  'FESTIVAL',
  'CONFERENCE',
  'SPORTS',
  'PRIVATE',
  'OTHER',
])

const eventFieldsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  venue: z.string().min(1, 'Venue is required').max(200),
  date: z.string().datetime({ message: 'Invalid date format' }),
  capacity: z.number().int().positive('Capacity must be a positive integer'),
  ticketsAvailable: z
    .number()
    .int()
    .positive('Tickets available must be a positive integer'),
  status: eventStatusSchema.optional().default('DRAFT'),
  eventType: eventTypeSchema.optional().default('OTHER'),
  baseTicketPrice: z.number().int().min(0, 'Price must be non-negative'),
  // Required for every new/edited event: it drives commission income in
  // analytics, and a silent default would fabricate a financial figure.
  // Pre-existing rows may still be null in the DB — see the migration.
  commissionPercentage: z
    .number({ message: 'Commission rate is required' })
    .int('Commission rate must be a whole percent')
    .min(0, 'Commission rate cannot be negative')
    .max(100, 'Commission rate cannot exceed 100%'),
  hasDiscount: z.boolean().optional().default(false),
  discountPercentage: z.number().int().min(0).max(100).optional().default(0),
  discountUpto: z.string().datetime().optional(),
  description: z.string().max(1000).optional(),
  isOpen: z.boolean().optional().default(true),
  // Accepts a Cloudinary public id or a legacy pasted URL — a plain
  // `.url()` here would reject every uploaded poster. See src/lib/media.ts.
  image: mediaRefSchema.optional(),
  genres: z.array(z.string()).default([]),
  // Nullable so an edit can unassign the event's artist; the empty option in
  // the form posts null rather than '' (which would fail the FK).
  artistId: z.string().min(1).nullish(),
})

export const createEventSchema = eventFieldsSchema
  .refine((d) => d.ticketsAvailable <= d.capacity, {
    message: 'Tickets available cannot exceed capacity',
    path: ['ticketsAvailable'],
  })
  .refine((d) => d.status !== 'COMPLETED' || isCompletableDate(d.date), {
    message: 'An event can only be marked completed once its date is today or in the past',
    path: ['status'],
  })

export const updateEventSchema = eventFieldsSchema.partial()

/**
 * Cancelling and refunding both demand a reason: these are the actions an audit
 * log exists to explain, and "why" is the half a status column cannot record.
 */
export const ticketReasonSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required').max(500),
})

export type TicketReasonInput = z.infer<typeof ticketReasonSchema>

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
      status: eventStatusSchema,
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
    status: eventStatusSchema,
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
    status: eventStatusSchema,
  }),
  checkIn: z.object({ scannedAt: z.string() }).nullable(),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type GenerateTicketInput = z.infer<typeof generateTicketSchema>
export type BulkGenerateTicketInput = z.infer<typeof bulkGenerateTicketSchema>
export type DistributorTicketInput = z.infer<typeof distributorTicketSchema>
export type RegisterInput = z.infer<typeof registerSchema>
