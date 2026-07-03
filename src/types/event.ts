import { z } from 'zod'

const eventArtistSchema = z.object({
  id: z.string(),
  artistName: z.string(),
  artistImage: z.string(),
})

const musicSchema = z.object({
  id: z.string(),
  musicTitle: z.string(),
})

const eventDetailArtistSchema = eventArtistSchema.extend({
  artistBand: z.string(),
  musics: z.array(musicSchema),
})

export const eventDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  venue: z.string(),
  date: z.string(),
  capacity: z.number().int().positive(),
  baseTicketPrice: z.number().int(),
  hasDiscount: z.boolean(),
  discountPercentage: z.number().int(),
  discountUpto: z.string().nullable(),
  isOpen: z.boolean(),
  image: z.string().nullable(),
  genres: z.array(z.string()),
  _count: z.object({ tickets: z.number().int() }).optional(),
  artist: eventArtistSchema.nullable(),
})

export const eventDetailSchema = eventDTOSchema.extend({
  artist: eventDetailArtistSchema.nullable(),
})

export const eventsResponseSchema = z.array(eventDTOSchema)

export type EventDTO = z.infer<typeof eventDTOSchema>
