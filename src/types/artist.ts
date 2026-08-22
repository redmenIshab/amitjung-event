import { z } from 'zod'
import { mediaRefSchema } from '@/lib/media'

export const createArtistSchema = z.object({
  artistName: z.string().min(1, 'Name is required').max(200),
  // mediaRefSchema permits '' (the event poster is optional); an artist photo
  // is not, so the emptiness check is restored here.
  artistImage: mediaRefSchema.refine((v) => v !== '', 'Image is required'),
  artistBand: z.string().min(1, 'Band is required').max(200),
  artistDescription: z.string().min(1, 'Description is required').max(2000),
  artistGenere: z.array(z.string()).min(1, 'At least one genre required'),
})

export const updateArtistSchema = createArtistSchema.partial()

export type CreateArtistInput = z.infer<typeof createArtistSchema>
export type UpdateArtistInput = z.infer<typeof updateArtistSchema>
