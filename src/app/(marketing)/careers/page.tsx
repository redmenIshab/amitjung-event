import Link from 'next/link'
import Button from '@/components/marketing/ui/Button'

export const metadata = {
  title: 'Careers — Lyante Production',
  description:
    'Join Lyante Production in Itahari, Nepal. Open roles: Digital Content Creator and Video Editor. Create content, coverage and brands with a team built by owners and proven on stage.',
}

type Job = {
  title: string
  tags: string[]
  summary: string
  responsibilities: string[]
  requirements: string[]
  niceToHave: string[]
}

const JOBS: Job[] = [
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
]

function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="section-label mb-3">{label}</p>
      <ul className="flex flex-col gap-2">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2.5 text-ash text-sm leading-relaxed">
            <span className="text-gold mt-1.5 w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
            {i}
          </li>
        ))}
      </ul>
    </div>
  )
}

function JobCard({ job }: { job: Job }) {
  const mailto = `mailto:lyanteprod@gmail.com?subject=${encodeURIComponent(
    `Application: ${job.title}`
  )}&body=${encodeURIComponent(
    `Hi Lyante team,\n\nI'd like to apply for the ${job.title} role.\n\n• Name:\n• Location:\n• Portfolio / reel link:\n\nA bit about me:\n`
  )}`

  return (
    <div className="gold-border rounded-sm bg-surface p-8 md:p-10">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-6">
        <div>
          <h2 className="font-cormorant font-bold text-ivory text-3xl md:text-4xl leading-tight mb-4">
            {job.title}
          </h2>
          <div className="flex flex-wrap gap-2">
            {job.tags.map((t) => (
              <span
                key={t}
                className="font-bebas text-sm tracking-widest text-ash border border-coal rounded-sm px-3 py-1.5"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <Button href={mailto} variant="gold" className="shrink-0">
          APPLY →
        </Button>
      </div>

      <p className="text-ash text-base leading-relaxed max-w-3xl mb-10">{job.summary}</p>

      <div className="grid md:grid-cols-2 gap-10">
        <List label="WHAT YOU'LL DO" items={job.responsibilities} />
        <div className="flex flex-col gap-10">
          <List label="WHAT YOU BRING" items={job.requirements} />
          <List label="NICE TO HAVE" items={job.niceToHave} />
        </div>
      </div>
    </div>
  )
}

export default function CareersPage() {
  return (
    <>
      {/* Hero */}
      <section className="px-4 md:px-20 pt-36 pb-16 bg-bg">
        <div className="max-w-[1400px] mx-auto">
          <p className="section-label mb-5">CAREERS</p>
          <h1
            className="font-cormorant font-bold text-ivory leading-[0.98] mb-8"
            style={{ fontSize: 'clamp(40px, 7vw, 88px)' }}
          >
            Come create with us.
          </h1>
          <p className="text-ash text-lg leading-relaxed max-w-2xl mb-8">
            Lyante Production is a creative event &amp; branding studio in the heart of Purba Nepal —
            built by owners, proven on stage. All roles are on-site in Itahari. We&rsquo;re looking
            for sharp, self-driven creators who want their work seen by real crowds. If that&rsquo;s
            you, we&rsquo;d love to meet.
          </p>
          <p className="inline-flex items-center gap-2.5 gold-border rounded-sm px-4 py-2.5 text-ivory text-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
            Freshers and highly motivated candidates are encouraged to apply.
          </p>
        </div>
      </section>

      {/* Openings */}
      <section className="px-4 md:px-20 py-12 md:py-16 bg-bg">
        <div className="max-w-[1400px] mx-auto">
          <p className="section-label mb-8">OPEN POSITIONS · {JOBS.length}</p>
          <div className="flex flex-col gap-6">
            {JOBS.map((job) => (
              <JobCard key={job.title} job={job} />
            ))}
          </div>
        </div>
      </section>

      {/* How to apply / CTA */}
      <section className="px-4 md:px-20 py-24 md:py-32 bg-surface-mid text-center">
        <div className="max-w-2xl mx-auto">
          <p className="section-label mb-4">HOW TO APPLY</p>
          <h2
            className="font-cormorant font-bold text-ivory mb-6 leading-tight"
            style={{ fontSize: 'var(--t-title)' }}
          >
            Send us your work.
          </h2>
          <p className="text-ash text-base leading-relaxed mb-10">
            Email your CV and a portfolio or reel to{' '}
            <a href="mailto:lyanteprod@gmail.com" className="text-gold hover:underline">
              lyanteprod@gmail.com
            </a>{' '}
            with the role in the subject line — or DM us on Instagram{' '}
            <a
              href="https://www.instagram.com/lyanteprod/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold hover:underline"
            >
              @lyanteprod
            </a>
            . We reply within a few days.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button href="mailto:lyanteprod@gmail.com?subject=Application%20—%20Lyante%20Production" variant="gold">
              EMAIL US →
            </Button>
            <Button href="/work" variant="outline">
              SEE OUR WORK
            </Button>
          </div>
          <div className="mt-12">
            <Link href="/" className="text-gold text-sm hover:underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
