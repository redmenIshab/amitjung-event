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
    src: '/video/showreel.mov',
    poster: '/images/photo-11.jpg',
    width: 1600,
    height: 900,
    title: 'Lyante Showreel',
    genre: 'Concerts',
  },
  { id: 'photo-2', type: 'photo', src: '/images/photo-2.jpg', width: 4284, height: 5712, title: 'Mid-Air Freeze', genre: 'Creative' },
  { id: 'photo-11', type: 'photo', src: '/images/photo-11.jpg', width: 1600, height: 900, title: 'Amit Jung & Gorkhey', genre: 'Concerts' },
  { id: 'photo-3', type: 'photo', src: '/images/photo-3.jpg', width: 1066, height: 1600, title: 'Throttle Up', genre: 'Creative' },
  { id: 'photo-19', type: 'photo', src: '/images/photo-19.jpg', width: 4000, height: 5000, title: 'Front Row Lights', genre: 'Concerts' },
  { id: 'photo-7', type: 'photo', src: '/images/photo-7.jpg', width: 1600, height: 900, title: 'Crowd Wave', genre: 'Concerts' },
  { id: 'photo-13', type: 'photo', src: '/images/photo-13.jpg', width: 3200, height: 4000, title: 'Backstage Minute', genre: 'Portraits' },
  { id: 'photo-4', type: 'photo', src: '/images/photo-4.jpg', width: 1066, height: 1600, title: 'Dust & Speed', genre: 'Creative' },
  { id: 'photo-22', type: 'photo', src: '/images/photo-22.jpg', width: 4000, height: 5000, title: 'Golden Hour Set', genre: 'Concerts' },
  { id: 'photo-15', type: 'photo', src: '/images/photo-15.jpg', width: 2649, height: 3311, title: 'Opening Ceremony', genre: 'Events' },
  { id: 'photo-5', type: 'photo', src: '/images/photo-5.jpg', width: 1066, height: 1600, title: 'Apex Corner', genre: 'Creative' },
  { id: 'photo-26', type: 'photo', src: '/images/photo-26.jpg', width: 1080, height: 1350, title: 'Spotlit Vocalist', genre: 'Portraits' },
  { id: 'photo-8', type: 'photo', src: '/images/photo-8.jpg', width: 1600, height: 900, title: 'Full House', genre: 'Events' },
  { id: 'photo-20', type: 'photo', src: '/images/photo-20.jpg', width: 3000, height: 3750, title: 'Encore Call', genre: 'Concerts' },
  { id: 'photo-6', type: 'photo', src: '/images/photo-6.jpg', width: 1066, height: 1600, title: 'Airborne', genre: 'Creative' },
  { id: 'photo-16', type: 'photo', src: '/images/photo-16.jpg', width: 2649, height: 3311, title: 'Award Night', genre: 'Events' },
  { id: 'photo-27', type: 'photo', src: '/images/photo-27.jpg', width: 1080, height: 1350, title: 'Green Room Portrait', genre: 'Portraits' },
  { id: 'photo-9', type: 'photo', src: '/images/photo-9.jpg', width: 1600, height: 900, title: 'Festival Grounds', genre: 'Events' },
  { id: 'photo-23', type: 'photo', src: '/images/photo-23.jpg', width: 4000, height: 5000, title: 'Bass Drop', genre: 'Concerts' },
  { id: 'photo-10', type: 'photo', src: '/images/photo-10.jpg', width: 1066, height: 1600, title: 'Ramp Run', genre: 'Creative' },
  { id: 'photo-17', type: 'photo', src: '/images/photo-17.jpg', width: 2649, height: 3311, title: 'Launch Evening', genre: 'Events' },
  { id: 'photo-28', type: 'photo', src: '/images/photo-28.jpg', width: 3000, height: 3750, title: 'Drummer in Gold', genre: 'Portraits' },
  { id: 'photo-12', type: 'photo', src: '/images/photo-12.jpg', width: 1066, height: 1600, title: 'Night Session', genre: 'Creative' },
  { id: 'photo-24', type: 'photo', src: '/images/photo-24.jpg', width: 4000, height: 5000, title: 'Hands Up', genre: 'Concerts' },
  { id: 'photo-1', type: 'photo', src: '/images/photo-1.jpg', width: 5712, height: 4284, title: 'The Long Stage', genre: 'Concerts' },
  { id: 'photo-18', type: 'photo', src: '/images/photo-18.jpg', width: 2649, height: 3311, title: 'Closing Toast', genre: 'Events' },
  { id: 'photo-29', type: 'photo', src: '/images/photo-29.jpg', width: 4000, height: 5000, title: 'Guitarist Close-Up', genre: 'Portraits' },
  { id: 'photo-14', type: 'photo', src: '/images/photo-14.jpg', width: 3000, height: 3750, title: 'Smoke & Strobe', genre: 'Creative' },
  { id: 'photo-25', type: 'photo', src: '/images/photo-25.jpg', width: 2649, height: 3311, title: 'Confetti Fall', genre: 'Concerts' },
  { id: 'photo-30', type: 'photo', src: '/images/photo-30.jpg', width: 4000, height: 5000, title: 'Last Song Silhouette', genre: 'Portraits' },
  { id: 'photo-21', type: 'photo', src: '/images/photo-21.jpg', width: 3200, height: 4000, title: 'Pyro Finale', genre: 'Concerts' },
]

export function filterWorks(works: Work[], media: MediaFilter, genre: Genre | null): Work[] {
  return works.filter(
    (w) => (media === 'all' || w.type === media) && (genre === null || w.genre === genre)
  )
}
