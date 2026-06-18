import { z } from 'zod'

export const createMusicSchema = z.object({
  musicTitle: z.string().min(1, 'Title is required').max(200),
  artistId: z.string().min(1, 'Artist is required'),
})

export const updateMusicSchema = createMusicSchema.partial()

export type CreateMusicInput = z.infer<typeof createMusicSchema>
export type UpdateMusicInput = z.infer<typeof updateMusicSchema>
