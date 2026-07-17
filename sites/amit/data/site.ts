// ─── Site configuration — edit everything here ──────────────────────────────
// Lyante Production updates this single file: contact routes, links,
// booked dates, discography. No other file needs touching.

export interface SiteWork {
  k: string
  title: string
  text: string
  href: string
  cta: string
}

export interface Site {
  artist: string
  artistDevanagari: string
  tagline: string
  album: string
  albumYear: string
  management: string
  lyanteUrl: string
  lyanteEventsUrl: string
  bookingEmail: string
  whatsapp: string
  socials: {
    instagram: string
    tiktok: string
    facebook: string
    soundcloud: string
    youtube: string
  }
  videos: { id: string; title: string }[]
  tracks: { url: string; title: string }[]
  works: SiteWork[]
  stats: { n: string; l: string }[]
  bookedDates: string[]
  slots: string[]
}

export const site: Site = {
  artist: 'Amit Jung',
  artistDevanagari: 'अमित जंग',
  tagline: 'Singer-songwriter · Kathmandu, Nepal',
  album: 'मेरो देश को कथा',
  albumYear: '2026',
  management: 'Lyante Production',

  // Cross-links back to the management site
  lyanteUrl: 'https://lyante.art',
  lyanteEventsUrl: 'https://lyante.art/ticketing',

  // Booking inquiries are routed here (mailto + WhatsApp deep link)
  bookingEmail: 'bookings@lyanteproduction.com',
  whatsapp: '9779800000000', // country code + number, digits only

  socials: {
    instagram: 'https://www.instagram.com/iamamitjung/',
    tiktok: 'https://www.tiktok.com/@amitjung555',
    facebook: 'https://www.facebook.com/amithustle/',
    soundcloud: 'https://soundcloud.com/amit-jung-official',
    youtube: 'https://www.youtube.com/watch?v=j3i9QU8bYqQ',
  },

  // YouTube video IDs shown in the Music section
  videos: [{ id: 'j3i9QU8bYqQ', title: 'Barsa Bhayecha Nepal Nafarkeko' }],

  // SoundCloud track pages shown in the Music section
  tracks: [
    {
      url: 'https://soundcloud.com/amit-jung-official/siddhartha-amit-jung',
      title: 'Siddhartha',
    },
    {
      url: 'https://soundcloud.com/amit-jung-official/samjhana-timilai-amit-jung-final-audio',
      title: 'Samjhana Timilai',
    },
    {
      url: 'https://soundcloud.com/amit-jung-official/barsha-bhayecha-nepal-na-farkayeko-unansweredby-amit-jung',
      title: 'Barsha Bhayecha Nepal Na Farkayeko',
    },
  ],

  works: [
    {
      k: 'Press',
      title: 'Featured — The Kathmandu Post',
      text: 'Profiled among Nepal’s leading independent voices in “Are Nepali independent singers struggling for a platform?”',
      href: 'https://kathmandupost.com/art-culture/2024/10/26/are-nepali-independent-singers-struggling-for-a-platform',
      cta: 'Read the feature',
    },
    {
      k: 'Live',
      title: 'Live at Moksh, Jhamsikhel',
      text: 'Regular headline sets at Kathmandu valley’s home of live original music.',
      href: 'https://www.instagram.com/iamamitjung/',
      cta: 'Watch clips',
    },
    {
      k: 'Album',
      title: 'Debut album — मेरो देश को कथा',
      text: 'A story-driven full-length record about home, distance and return. Releasing 2026 under Lyante Production.',
      href: 'https://www.instagram.com/iamamitjung/',
      cta: 'Follow the journey',
    },
    {
      k: 'Signature',
      title: 'Barsa Bhayecha Nepal Nafarkeko',
      text: 'The diaspora anthem — written for every Nepali who has watched Dashain pass from far away.',
      href: 'https://www.youtube.com/watch?v=j3i9QU8bYqQ',
      cta: 'Listen on YouTube',
    },
  ],

  stats: [
    { n: '8+', l: 'years in craft' },
    { n: '460+', l: 'released works & posts' },
    { n: '10K+', l: 'listeners following' },
    { n: '2026', l: 'debut album' },
  ],

  // Dates already booked / blocked (YYYY-MM-DD). Everything else is open.
  bookedDates: [
    '2026-07-24',
    '2026-07-25',
    '2026-08-01',
    '2026-08-08',
    '2026-08-15',
    '2026-08-29',
    '2026-09-05',
    '2026-09-19',
  ],

  slots: [
    'Evening set (45–60 min)',
    'Full show (90+ min)',
    'Private / corporate event',
    'Festival slot',
  ],
}
