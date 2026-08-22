/**
 * Open roles, rendered by `/careers`.
 *
 * Kept out of the page component so the data can be tested without pulling in
 * React — the same split as `works.ts` for the marketing gallery.
 */

export type Job = {
  title: string
  tags: string[]
  summary: string
  responsibilities: string[]
  requirements: string[]
  niceToHave: string[]
  /**
   * Where applications go. Defaults to the Lyante address; set it when a role
   * is hired for by a different part of the business.
   */
  applyEmail?: string
  /** Overrides the default `Application: <title>` subject line. */
  applySubject?: string
  /**
   * What the candidate must send. When present the card renders a HOW TO APPLY
   * block, and the prefilled email body asks for these instead of the
   * portfolio/reel the creative roles want.
   */
  applySteps?: string[]
  /** One closing line under the apply steps. */
  applyNote?: string
}

/** Fallback destination for roles that do not name their own. */
export const DEFAULT_APPLY_EMAIL = 'lyanteprod@gmail.com'

export const JOBS: Job[] = [
  {
    title: 'Digital Content Creator',
    tags: ['Full-time', 'On-site · Itahari', 'Freshers welcome', 'Content & Social'],
    summary:
      'You live on the internet and know exactly what makes people stop scrolling. You’ll plan, shoot and publish content for Lyante and the brands we work with — turning events, cafés and businesses into feeds people actually follow.',
    responsibilities: [
      'Plan and own a content calendar across Instagram, TikTok and Facebook',
      'Shoot photo, video and reels — both on-set at events and in-studio',
      'Capture behind-the-scenes and on-ground coverage during live events',
      'Write scroll-stopping captions and short-form copy (Nepali & English)',
      'Schedule, publish and engage — comments, DMs and community',
      'Track what works and adjust — reach, saves, follower growth',
    ],
    requirements: [
      'A sharp sense of trends, aesthetics and timing',
      'Comfortable shooting on a phone and a camera',
      'Hands-on with editing tools (CapCut, Premiere, Lightroom or similar)',
      'Deep familiarity with Instagram & TikTok formats and what performs',
      'A portfolio or a personal/handled account that shows your eye',
      'Self-driven, organised and reliable with deadlines',
    ],
    niceToHave: ['Basic graphic design (Canva / Figma / Photoshop)', 'Photography skills', 'Strong bilingual copywriting'],
  },
  {
    title: 'Video Editor',
    tags: ['Full-time', 'On-site · Itahari', 'Freshers welcome', 'Post-Production'],
    summary:
      'You turn raw footage into films people feel. You’ll cut reels, highlight films, sponsor reels and brand ads for concerts, festivals and businesses — with the pacing and polish that makes Lyante’s work stand out.',
    responsibilities: [
      'Edit short-form reels and long-form highlight films from event footage',
      'Cut brand ads, promos and sponsor reels to brief',
      'Colour grade and balance sound for a clean, cinematic finish',
      'Add titles, lower-thirds and simple motion graphics',
      'Organise and manage large volumes of footage across projects',
      'Deliver fast and on time during tight event cycles',
    ],
    requirements: [
      'Proficiency in Premiere Pro, DaVinci Resolve, CapCut or Final Cut',
      'Strong instinct for pacing, rhythm and storytelling',
      'A showreel or portfolio of edited work',
      'Solid grasp of export settings for each platform',
      'Well-organised with project files and media',
      'Able to work quickly under event-driven deadlines',
    ],
    niceToHave: ['Motion graphics (After Effects)', 'Advanced colour grading', 'Sound design / music editing'],
  },
  {
    title: 'Business Research & Client Acquisition Intern',
    tags: ['Internship · 3 months', 'Hybrid · Itahari', 'Fixed stipend', '2 positions'],
    summary:
      'Eastern Nepal has hundreds of restaurants, venues, colleges, festivals and consumer brands — most marketing themselves badly or not at all, and almost none running proper ticketing. You’ll map that market, name every business worth approaching and build the pipeline our growth runs on. This is not a coffee-and-photocopying internship: what you build is the list the company sells from.',
    responsibilities: [
      'Build and maintain a named database of businesses across Biratnagar, Itahari and the surrounding areas',
      'Research each one — who owns it, how big it is, what it sells, who buys — and name the single gap we could fill',
      'Map every ticketed event in the region and record how each currently sells tickets: paper stubs, cash box, a manual list or a digital system',
      'Photograph and log event banners — the sponsor logos printed on them are a ready-made list of brands with marketing budgets',
      'Find decision-makers and verify their details from public sources before recording them',
      'Keep the trackers current and write short pre-meeting briefs on each prospect',
      'Draft first-contact messages for email, Instagram DM and Viber, then follow up by phone',
      'Track what competing agencies and ticketing platforms are doing, pricing and promising',
    ],
    requirements: [
      'Recently graduated or in the final stage of a degree — any field. We care more about how you think than what you studied',
      'Hungry for growth and genuinely curious about how businesses work',
      'Organised — this role generates a lot of information and it is worthless if it is messy',
      'A real researcher, able to drill through the noise online and on social media',
      'Willing to make phone calls and meet people you don’t know. This is the part most people avoid, and it is not optional',
      'Based in or able to work from Itahari, and available for market visits',
      'Accountable and honest about what you don’t know — we would far rather hear “I couldn’t find it” than receive an invented number',
    ],
    niceToHave: [
      'Prior sales, retail, campus event or volunteer experience',
      'Familiarity with the local business scene — which cafés are busy, which festivals draw crowds',
      'Basic design or content skills (Canva, phone photography, video)',
      'A two-wheeler and a licence',
      'Having chased sponsors for a college event, fest or fundraiser',
      'Interest in building IT products and creative content',
    ],
    // Hired for by Software Factory, not Lyante Production.
    applyEmail: 'factorysoftware2021@gmail.com',
    // Trailing dash is deliberate — the source posting leaves it for the
    // applicant to complete.
    applySubject: 'Business Research Intern — ',
    applySteps: [
      'Your CV — one page is enough',
      'A short note, no more than 150 words, on why this role interests you',
      'A task: list five businesses in Itahari you think should be marketing themselves better, with one sentence each on what they’re getting wrong or missing',
    ],
    applyNote:
      'The task matters more than the CV. It takes about twenty minutes and tells us what a CV can’t — whether you notice things and can express a judgement. We read those first, and we reply to everyone who completes it.',
  },
]
