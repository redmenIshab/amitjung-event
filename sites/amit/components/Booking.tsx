'use client'

import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { site } from '@/data/site'

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

interface Form {
  name: string
  org: string
  email: string
  slot: string
  venue: string
  message: string
}

export default function Booking() {
  const today = useMemo(() => {
    const t = new Date()
    return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() }
  }, [])

  const [view, setView] = useState({ y: today.y, m: today.m })
  const [selected, setSelected] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState<Form>({
    name: '',
    org: '',
    email: '',
    slot: site.slots[0],
    venue: '',
    message: '',
  })

  const booked = useMemo(() => new Set(site.bookedDates), [])

  // Allow browsing up to 6 months ahead
  const maxView = useMemo(() => {
    const d = new Date(today.y, today.m + 6, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  }, [today])

  const canPrev = view.y > today.y || view.m > today.m
  const canNext = view.y < maxView.y || view.m < maxView.m

  const shift = (dir: number) => {
    const d = new Date(view.y, view.m + dir, 1)
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }

  const firstDow = new Date(view.y, view.m, 1).getDay()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isPast = (d: number) =>
    view.y === today.y && view.m === today.m ? d < today.d : false

  const set =
    (k: keyof Form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [k]: e.target.value })

  const mailBody = () =>
    encodeURIComponent(
      `Booking request — ${site.artist}\n\n` +
        `Date: ${selected}\n` +
        `Slot: ${form.slot}\n` +
        `Organizer: ${form.name}\n` +
        `Organization: ${form.org}\n` +
        `Reply-to: ${form.email}\n` +
        `Venue / City: ${form.venue}\n\n` +
        `Details:\n${form.message}\n\n` +
        `— sent from amitjung official site`
    )

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selected) return
    window.location.href = `mailto:${site.bookingEmail}?subject=${encodeURIComponent(
      `Booking request: ${site.artist} — ${selected}`
    )}&body=${mailBody()}`
    setSent(true)
  }

  const waLink = () =>
    `https://wa.me/${site.whatsapp}?text=${encodeURIComponent(
      `Hi ${site.management}, I'd like to book ${site.artist} on ${selected} (${form.slot}). — ${form.name}, ${form.org}`
    )}`

  return (
    <div className="booking-grid">
      {/* Calendar */}
      <div className="cal">
        <div className="cal-head">
          <h3>
            {MONTHS[view.m]} {view.y}
          </h3>
          <div className="cal-nav">
            <button onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month">
              ←
            </button>
            <button onClick={() => shift(1)} disabled={!canNext} aria-label="Next month">
              →
            </button>
          </div>
        </div>

        <div className="cal-grid">
          {DOW.map((d) => (
            <div key={d} className="cal-dow">
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} />
            const dateStr = iso(view.y, view.m, d)
            const isBooked = booked.has(dateStr)
            const past = isPast(d)
            const sel = selected === dateStr
            return (
              <button
                key={dateStr}
                className={`cal-day ${isBooked ? 'booked' : 'open'} ${sel ? 'selected' : ''}`}
                disabled={past || isBooked}
                onClick={() => {
                  setSelected(dateStr)
                  setSent(false)
                }}
              >
                {d}
              </button>
            )
          })}
        </div>

        <div className="cal-legend">
          <span className="lg-open">
            <i />
            Available
          </span>
          <span className="lg-booked">
            <i />
            Booked
          </span>
          <span className="lg-sel">
            <i />
            Your date
          </span>
        </div>
      </div>

      {/* Inquiry form */}
      <form className="bform" onSubmit={submit}>
        <div className="bform-date">
          {selected ? (
            <>
              Requesting <b>{selected}</b> — pick a slot and tell us about the
              event.
            </>
          ) : (
            <>Select an available date on the calendar to begin.</>
          )}
        </div>

        <div className="bform-row">
          <div>
            <label>Your name</label>
            <input required value={form.name} onChange={set('name')} placeholder="Full name" />
          </div>
          <div>
            <label>Organization</label>
            <input required value={form.org} onChange={set('org')} placeholder="Company / event brand" />
          </div>
        </div>

        <div className="bform-row">
          <div>
            <label>Email</label>
            <input type="email" required value={form.email} onChange={set('email')} placeholder="you@company.com" />
          </div>
          <div>
            <label>Performance slot</label>
            <select value={form.slot} onChange={set('slot')}>
              {site.slots.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label>Venue / city</label>
          <input value={form.venue} onChange={set('venue')} placeholder="e.g. Moksh, Jhamsikhel — Kathmandu" />
        </div>

        <div>
          <label>Event details</label>
          <textarea
            rows={4}
            value={form.message}
            onChange={set('message')}
            placeholder="Audience size, event type, budget range, technical setup…"
          />
        </div>

        {sent && (
          <div className="bform-success">
            Your email app should have opened with the request. Prefer chat?
            Send the same request on{' '}
            <a href={waLink()} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>
              WhatsApp
            </a>
            . {site.management} confirms within 24 hours with a formal
            agreement.
          </div>
        )}

        <div className="bform-actions">
          <button type="submit" className="btn btn-primary" disabled={!selected}>
            Request this date
          </button>
          {selected && (
            <a className="btn btn-ghost" href={waLink()} target="_blank" rel="noreferrer">
              WhatsApp instead
            </a>
          )}
        </div>

        <p className="bform-note">
          Requests go directly to {site.management}. A booking is confirmed
          only after a written agreement and deposit — the calendar shows live
          availability, not confirmation.
        </p>
      </form>
    </div>
  )
}
