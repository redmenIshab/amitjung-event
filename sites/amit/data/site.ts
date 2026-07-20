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
  tracks: { id: string; title: string }[]
  works: SiteWork[]
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
