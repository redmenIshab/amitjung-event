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

export interface BandMember {
  /** Instrument / role — shown as the kicker. */
  role: string
  /** Person's name — shown as the heading. Omit until confirmed. */
  name?: string
  bio: string
  /** Photo URL. Leave empty to render the placeholder until the photo is ready. */
  photo?: string
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
  tracks: { id: string; title: string }[]
  works: SiteWork[]
  band: BandMember[]
  stats: { n: string; l: string }[]
  bookedDates: string[]
  slots: string[]
  tech: {
    intro: string
    specs: { label: string; value: string }[]
    note: string
  }
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
    youtube: 'https://www.youtube.com/@Amitjung_gorkhey',
  },

  // YouTube video IDs shown in the Music section
  videos: [{ id: 'jJDSD3lKPB8', title: 'Mann Ka Lahar' }],

  // Spotify track IDs shown in the Music section
  // (embed URL: https://open.spotify.com/embed/track/<id>)
  tracks: [
    { id: '3z24YhPCSe0Y47cYZ3dI6c', title: 'Amit Jung on Spotify' },
    { id: '0SRB0xk5qjYiTjlq64Brir', title: 'Amit Jung on Spotify' },
    { id: '6cQWD5O576kqHm1i0zJFaV', title: 'Amit Jung on Spotify' },
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

  // The live band — Amit Jung and the Gorkhey. Add a `photo` URL to each member
  // when the images are ready; until then a placeholder card is shown.
  band: [
    {
      role: 'Vocals · Songwriter',
      name: 'Amit Jung',
      photo: '',
      bio: "Hi, I'm Amit Jung, a singer-songwriter from Nepal and the voice behind Amit Jung & Gorkhey. My music blends modern Western sound with the soul of Nepali folk storytelling. Through my upcoming album, मेरो देश को कथा, I share stories of ordinary people — their struggles, dreams, and the spirit of our land. I believe music is more than entertainment; it is a way to preserve memories, ask questions, and connect people through honest stories.",
    },
    {
      role: 'Drums',
      photo: '',
      bio: "I've been playing drums since 2016 and currently hold the kit for Amit Jung & Gorkhey. With years of stage and studio experience, I work as both a session and touring drummer, collaborating with diverse artists across genres. Groove, precision, and energy define every performance I deliver.",
    },
    {
      role: 'Bass',
      photo: '',
      bio: "I've been playing bass since 2016 and currently hold the low end for Amit Jung & Gorkhey. With years of stage and studio experience, I work as both a session and touring bassist, collaborating with diverse artists across genres. Groove, precision, and energy define every performance I deliver.",
    },
    {
      role: 'Lead Guitar',
      photo: '',
      bio: 'Guitarist since 2016, collaborating with artists and bands across live shows, studio sessions, and creative projects. Passionate about crafting parts, exploring new sounds, and bringing every song to life with feel and energy.',
    },
    {
      role: 'Keys · Vocals',
      name: 'Prasong',
      photo: '',
      bio: 'Since 2017 Prasong has been actively participating in the music scene of Nepal and has been a part of many notable acts, focusing his craft in keyboards and vocals.',
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

  // Preview of the band's technical rider (v2, 2026). This is a summary for
  // organizers — the complete rider (full input/output patch lists, stage plot
  // and backline spec) is shared on booking, not published here.
  tech: {
    intro:
      'For full-production shows, Amit performs with his band — Amit Jung and the Gorkhey. Here is a summary of our stage and technical needs; the complete technical rider is shared when you book.',
    specs: [
      {
        label: 'Ensemble',
        value:
          'Six-piece live band — drums, bass, electric guitar, keys, flute and lead vocal, with backing vocals.',
      },
      {
        label: 'FOH sound',
        value:
          'Stereo hi-fidelity PA covering the full audience at 116 dB(C) / 100 dB(A). Preferred: RCF HDL 30 / 20 line array or EV EKX / ELX point source with matching subs.',
      },
      {
        label: 'Console',
        value: 'Midas M32 preferred (or anything better).',
      },
      {
        label: 'Monitoring',
        value: 'In-ear monitoring for the band plus a floor wedge for keys.',
      },
      {
        label: 'Backline',
        value:
          'Full backline required — Pearl Decade drum kit, Vox or Orange guitar amp, guitar stands, DIs and mic stands.',
      },
      {
        label: 'Sound check',
        value:
          'Minimum 90 minutes, beginning once all backline is in position and operational on stage.',
      },
    ],
    note: 'This is a preview of our technical rider. For the complete document — full input and output patch lists, backline spec and stage details — reach out to book.',
  },
}
