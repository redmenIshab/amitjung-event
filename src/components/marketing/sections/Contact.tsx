'use client'

import { FormEvent, useState } from 'react'
import Button from '@/components/marketing/ui/Button'

const SERVICES = ['Production', 'Ticketing', 'Branding', 'All of the above']

export default function Contact() {
  const [services, setServices] = useState<string[]>([])

  const toggle = (s: string) =>
    setServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const subject = encodeURIComponent(`Brief: ${data.get('event-name') || 'New Event'}`)
    const body = encodeURIComponent(
      `Event: ${data.get('event-name')}\nDate: ${data.get('event-date')}\nServices: ${services.join(', ')}\n\n${data.get('message')}`
    )
    window.location.href = `mailto:lyanteprod@gmail.com?subject=${subject}&body=${body}`
  }

  const inputCls =
    'w-full bg-transparent border-0 border-b border-gold/40 focus:border-gold focus:outline-none text-ivory py-3 text-sm font-dm placeholder:text-coal transition-colors duration-200'

  return (
    <section className="py-24 md:py-32 px-4 md:px-20 bg-bg" id="contact">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-3 gap-16 items-start">
          <div className="md:col-span-1">
            <h2
              className="font-cormorant font-bold gold-text leading-tight"
              style={{ fontSize: 'var(--t-display)' }}
            >
              Let&apos;s create something unforgettable.
            </h2>
            <p className="text-ash text-sm mt-6 leading-relaxed">
              Tell us about your event and we&apos;ll get back to you within 24 hours.
            </p>

            <div className="mt-10 flex flex-col gap-4">
              <a
                href="mailto:lyanteprod@gmail.com"
                className="flex items-center gap-3 text-ash hover:text-gold transition-colors text-sm group"
              >
                <span className="w-8 h-8 rounded-full border border-coal group-hover:border-gold flex items-center justify-center transition-colors">
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-4 h-4">
                    <rect x="2" y="4" width="16" height="12" rx="2" />
                    <path d="M2 7l8 5 8-5" />
                  </svg>
                </span>
                lyanteprod@gmail.com
              </a>
              <a
                href="https://www.instagram.com/lyanteprod/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-ash hover:text-gold transition-colors text-sm group"
              >
                <span className="w-8 h-8 rounded-full border border-coal group-hover:border-gold flex items-center justify-center transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
                    <rect x="2" y="2" width="20" height="20" rx="5" />
                    <circle cx="12" cy="12" r="5" />
                    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                @lyanteprod
              </a>
              <a
                href="https://www.tiktok.com/@lyanteprod"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-ash hover:text-gold transition-colors text-sm group"
              >
                <span className="w-8 h-8 rounded-full border border-coal group-hover:border-gold flex items-center justify-center transition-colors">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.93a8.16 8.16 0 0 0 4.77 1.52V7a4.85 4.85 0 0 1-1-.31z" />
                  </svg>
                </span>
                @lyanteprod
              </a>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="md:col-span-2 flex flex-col gap-8">
            <div>
              <label htmlFor="event-name" className="section-label block mb-2">Event Name</label>
              <input
                id="event-name"
                name="event-name"
                type="text"
                required
                placeholder="e.g. Annual Gala 2025"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="event-date" className="section-label block mb-2">Event Date</label>
              <input id="event-date" name="event-date" type="date" className={inputCls} />
            </div>

            <fieldset>
              <legend className="section-label mb-4">Service Needed</legend>
              <div className="flex flex-wrap gap-3">
                {SERVICES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(s)}
                    className={`px-4 py-2 text-sm font-dm border transition-all duration-200 min-h-[48px] ${
                      services.includes(s)
                        ? 'border-gold bg-gold text-bg'
                        : 'border-coal text-ash hover:border-gold hover:text-gold'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="message" className="section-label block mb-2">Tell Us More</label>
              <textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Describe your event, vision, and any specific requirements..."
                className={`${inputCls} resize-none`}
              />
            </div>

            <Button type="submit" variant="gold" className="self-start">
              SEND YOUR BRIEF →
            </Button>
          </form>
        </div>
      </div>
    </section>
  )
}
