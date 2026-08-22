import Link from 'next/link'
import Button from '@/components/marketing/ui/Button'
import { JOBS, DEFAULT_APPLY_EMAIL, type Job } from '@/components/marketing/careers/jobs'

export const metadata = {
  title: 'Careers — Lyante Production',
  description:
    'Join Lyante Production and Software Factory in Itahari, Nepal. Open roles: Digital Content Creator, Video Editor and Business Research & Client Acquisition Intern.',
}

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
  // A role may be hired for by a different part of the business, and may screen
  // on a written task rather than a reel — so the address, the subject and the
  // prefilled body all follow the job rather than being fixed to Lyante.
  const to = job.applyEmail ?? DEFAULT_APPLY_EMAIL
  const subject = job.applySubject ?? `Application: ${job.title}`
  const body = job.applySteps
    ? `Hello,\n\nI'd like to apply for the ${job.title} role.\n\n• Name:\n• Location:\n\nAttached / below:\n${job.applySteps
        .map((step, i) => `${i + 1}. ${step}`)
        .join('\n')}\n`
    : `Hi Lyante team,\n\nI'd like to apply for the ${job.title} role.\n\n• Name:\n• Location:\n• Portfolio / reel link:\n\nA bit about me:\n`

  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

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

      {job.applySteps && (
        <div className="mt-10 pt-8 border-t border-coal">
          <p className="section-label mb-3">HOW TO APPLY</p>
          <ol className="flex flex-col gap-2">
            {job.applySteps.map((step, i) => (
              <li key={step} className="flex items-start gap-2.5 text-ash text-sm leading-relaxed">
                <span className="font-bebas text-gold text-sm tracking-widest shrink-0 mt-px">
                  {i + 1}.
                </span>
                {step}
              </li>
            ))}
          </ol>
          {job.applyNote && (
            <p className="text-ash text-sm leading-relaxed mt-4 max-w-3xl italic">
              {job.applyNote}
            </p>
          )}
          <p className="text-ash text-sm mt-4">
            Send to{' '}
            <a href={`mailto:${to}`} className="text-gold hover:underline">
              {to}
            </a>
          </p>
        </div>
      )}
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
            built by owners, proven on stage &mdash; alongside Software Factory, our IT wing.
            Roles are based in Itahari, on-site or hybrid. We&rsquo;re looking for sharp,
            self-driven people who want their work seen by real crowds. If that&rsquo;s you,
            we&rsquo;d love to meet.
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
            <Button href="/about#work" variant="outline">
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
