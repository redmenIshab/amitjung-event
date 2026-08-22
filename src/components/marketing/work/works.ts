export type WorkType = 'photo' | 'video'
export type Genre = 'Concerts' | 'Creative' | 'Events' | 'Portraits'
export type MediaFilter = 'all' | 'photo' | 'video'

export interface Work {
  id: string
  type: WorkType
  src: string
  poster?: string
  width: number
  height: number
  title: string
  genre: Genre
}

export const GENRES: Genre[] = ['Concerts', 'Creative', 'Events', 'Portraits']

// Dimensions are the real pixel sizes of the files in public/images —
// they drive each tile's reserved aspect ratio (no layout shift).
export const WORKS: Work[] = [
  {
    id: 'showreel',
    type: 'video',
    src: 'lyante/gallery/showreel',
    poster: 'lyante/gallery/photo-11',
    width: 1600,
    height: 900,
    title: 'Lyante Showreel',
    genre: 'Concerts',
  },
  { id: 'photo-2', type: 'photo', src: 'lyante/gallery/photo-2', width: 4284, height: 5712, title: 'Mid-Air Freeze', genre: 'Creative' },
  { id: 'photo-11', type: 'photo', src: 'lyante/gallery/photo-11', width: 1600, height: 900, title: 'Amit Jung & Gorkhey', genre: 'Concerts' },
  { id: 'photo-3', type: 'photo', src: 'lyante/gallery/photo-3', width: 1066, height: 1600, title: 'Throttle Up', genre: 'Creative' },
  { id: 'photo-19', type: 'photo', src: 'lyante/gallery/photo-19', width: 4000, height: 5000, title: 'Front Row Lights', genre: 'Concerts' },
  { id: 'photo-7', type: 'photo', src: 'lyante/gallery/photo-7', width: 1600, height: 900, title: 'Crowd Wave', genre: 'Concerts' },
  { id: 'photo-13', type: 'photo', src: 'lyante/gallery/photo-13', width: 3200, height: 4000, title: 'Backstage Minute', genre: 'Portraits' },
  { id: 'photo-4', type: 'photo', src: 'lyante/gallery/photo-4', width: 1066, height: 1600, title: 'Dust & Speed', genre: 'Creative' },
  { id: 'photo-22', type: 'photo', src: 'lyante/gallery/photo-22', width: 4000, height: 5000, title: 'Golden Hour Set', genre: 'Concerts' },
  { id: 'photo-15', type: 'photo', src: 'lyante/gallery/photo-15', width: 2649, height: 3311, title: 'Opening Ceremony', genre: 'Events' },
  { id: 'photo-5', type: 'photo', src: 'lyante/gallery/photo-5', width: 1066, height: 1600, title: 'Apex Corner', genre: 'Creative' },
  { id: 'photo-26', type: 'photo', src: 'lyante/gallery/photo-26', width: 1080, height: 1350, title: 'Spotlit Vocalist', genre: 'Portraits' },
  { id: 'photo-8', type: 'photo', src: 'lyante/gallery/photo-8', width: 1600, height: 900, title: 'Full House', genre: 'Events' },
  { id: 'photo-20', type: 'photo', src: 'lyante/gallery/photo-20', width: 3000, height: 3750, title: 'Encore Call', genre: 'Concerts' },
  { id: 'photo-6', type: 'photo', src: 'lyante/gallery/photo-6', width: 1066, height: 1600, title: 'Airborne', genre: 'Creative' },
  { id: 'photo-16', type: 'photo', src: 'lyante/gallery/photo-16', width: 2649, height: 3311, title: 'Award Night', genre: 'Events' },
  { id: 'photo-27', type: 'photo', src: 'lyante/gallery/photo-27', width: 1080, height: 1350, title: 'Green Room Portrait', genre: 'Portraits' },
  { id: 'photo-9', type: 'photo', src: 'lyante/gallery/photo-9', width: 1600, height: 900, title: 'Festival Grounds', genre: 'Events' },
  { id: 'photo-23', type: 'photo', src: 'lyante/gallery/photo-23', width: 4000, height: 5000, title: 'Bass Drop', genre: 'Concerts' },
  { id: 'photo-10', type: 'photo', src: 'lyante/gallery/photo-10', width: 1066, height: 1600, title: 'Ramp Run', genre: 'Creative' },
  { id: 'photo-17', type: 'photo', src: 'lyante/gallery/photo-17', width: 2649, height: 3311, title: 'Launch Evening', genre: 'Events' },
  { id: 'photo-28', type: 'photo', src: 'lyante/gallery/photo-28', width: 3000, height: 3750, title: 'Drummer in Gold', genre: 'Portraits' },
  { id: 'photo-12', type: 'photo', src: 'lyante/gallery/photo-12', width: 1066, height: 1600, title: 'Night Session', genre: 'Creative' },
  { id: 'photo-24', type: 'photo', src: 'lyante/gallery/photo-24', width: 4000, height: 5000, title: 'Hands Up', genre: 'Concerts' },
  { id: 'photo-1', type: 'photo', src: 'lyante/gallery/photo-1', width: 5712, height: 4284, title: 'The Long Stage', genre: 'Concerts' },
  { id: 'photo-18', type: 'photo', src: 'lyante/gallery/photo-18', width: 2649, height: 3311, title: 'Closing Toast', genre: 'Events' },
  { id: 'photo-29', type: 'photo', src: 'lyante/gallery/photo-29', width: 4000, height: 5000, title: 'Guitarist Close-Up', genre: 'Portraits' },
  { id: 'photo-14', type: 'photo', src: 'lyante/gallery/photo-14', width: 3000, height: 3750, title: 'Smoke & Strobe', genre: 'Creative' },
  { id: 'photo-25', type: 'photo', src: 'lyante/gallery/photo-25', width: 2649, height: 3311, title: 'Confetti Fall', genre: 'Concerts' },
  { id: 'photo-30', type: 'photo', src: 'lyante/gallery/photo-30', width: 4000, height: 5000, title: 'Last Song Silhouette', genre: 'Portraits' },
  { id: 'photo-21', type: 'photo', src: 'lyante/gallery/photo-21', width: 3200, height: 4000, title: 'Pyro Finale', genre: 'Concerts' },
]

export function filterWorks(works: Work[], media: MediaFilter, genre: Genre | null): Work[] {
  return works.filter(
    (w) => (media === 'all' || w.type === media) && (genre === null || w.genre === genre)
  )
}
