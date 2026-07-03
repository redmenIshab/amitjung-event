import { z } from 'zod'

export const createArtistSchema = z.object({
  artistName: z.string().min(1, 'Name is required').max(200),
  artistImage: z.string().url('Must be a valid URL'),
  artistBand: z.string().min(1, 'Band is required').max(200),
  artistDescription: z.string().min(1, 'Description is required').max(2000),
  artistGenere: z.array(z.string()).min(1, 'At least one genre required'),
})

export const updateArtistSchema = createArtistSchema.partial()

export type CreateArtistInput = z.infer<typeof createArtistSchema>
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>
