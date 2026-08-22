import { describe, it, expect } from 'vitest'
import { JOBS, DEFAULT_APPLY_EMAIL, type Job } from '@/components/marketing/careers/jobs'

/**
 * The careers listing is hand-maintained data rendered straight onto a public
 * page, so the failure mode is a half-filled entry going live — a role with no
 * summary, or one that names its own inbox but not what to send there.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

describe('every open role is complete', () => {
  it.each(JOBS.map((j) => [j.title, j] as [string, Job]))('%s', (_title, job) => {
    expect(job.title.trim().length).toBeGreaterThan(0)
    expect(job.summary.trim().length).toBeGreaterThan(0)
    expect(job.tags.length).toBeGreaterThan(0)
    expect(job.responsibilities.length).toBeGreaterThan(0)
    expect(job.requirements.length).toBeGreaterThan(0)
    expect(job.niceToHave.length).toBeGreaterThan(0)
  })

  it('has no duplicate titles — the list is keyed by title', () => {
    expect(new Set(JOBS.map((j) => j.title)).size).toBe(JOBS.length)
  })

  it('has no blank list entries', () => {
    for (const job of JOBS) {
      const all = [...job.tags, ...job.responsibilities, ...job.requirements, ...job.niceToHave]
      expect(all.every((line) => line.trim().length > 0)).toBe(true)
    }
  })
})

describe('the apply path is coherent per role', () => {
  it('any overridden apply email is a valid address', () => {
    for (const job of JOBS) {
      if (job.applyEmail) expect(job.applyEmail).toMatch(EMAIL)
    }
    expect(DEFAULT_APPLY_EMAIL).toMatch(EMAIL)
  })

  it('a role that routes applications elsewhere also says what to send', () => {
    // Half-configuring this is the real risk: a custom inbox with no steps
    // sends candidates the creative roles' portfolio prompt, which is wrong
    // for a role screened on a written task.
    for (const job of JOBS) {
      if (job.applyEmail && job.applyEmail !== DEFAULT_APPLY_EMAIL) {
        expect(job.applySteps?.length ?? 0).toBeGreaterThan(0)
      }
    }
  })

  it('applyNote only appears alongside steps it belongs to', () => {
    for (const job of JOBS) {
      if (job.applyNote) expect(job.applySteps?.length ?? 0).toBeGreaterThan(0)
    }
  })

  it('leaves the two creative roles on the default inbox, unchanged', () => {
    for (const title of ['Digital Content Creator', 'Video Editor']) {
      const job = JOBS.find((j) => j.title === title)
      expect(job).toBeDefined()
      expect(job!.applyEmail).toBeUndefined()
      expect(job!.applySteps).toBeUndefined()
    }
  })
})

describe('the Business Research intern posting', () => {
  const job = JOBS.find((j) => j.title.startsWith('Business Research'))

  it('is listed', () => {
    expect(job).toBeDefined()
  })

  it('routes to Software Factory, not Lyante', () => {
    expect(job!.applyEmail).toBe('factorysoftware2021@gmail.com')
  })

  it('asks for the five-business task, which is what they screen on', () => {
    expect(job!.applySteps!.some((s) => /five businesses/i.test(s))).toBe(true)
  })

  it('is tagged hybrid, since the page otherwise implies on-site only', () => {
    expect(job!.tags.some((t) => /hybrid/i.test(t))).toBe(true)
  })
})
