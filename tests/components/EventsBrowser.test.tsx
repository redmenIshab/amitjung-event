// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import { EventsBrowser } from '@/components/events/EventsBrowser'
import type { EventCardData } from '@/components/events/EventCard'

function makeEvent(over: Partial<EventCardData> & Pick<EventCardData, 'id'>): EventCardData {
  return {
    title: `Event ${over.id}`,
    image: '',
    artistImage: '',
    venue: 'Kathmandu',
    date: '2026-09-01T00:00:00.000Z',
    eventType: 'CONCERT',
    badges: [],
    bucket: 'upcoming',
    isPurchasable: true,
    soldOut: false,
    ...over,
  }
}

// Two upcoming (Jazz Night is the sooner), one past, one completed.
const EVENTS: EventCardData[] = [
  makeEvent({ id: 'a', title: 'Jazz Night', date: '2026-09-01T00:00:00.000Z', venue: 'Patan' }),
  makeEvent({ id: 'b', title: 'Rock Revival', date: '2026-10-01T00:00:00.000Z', venue: 'Thamel' }),
  makeEvent({ id: 'c', title: 'Jazz Reunion', bucket: 'past', isPurchasable: false, venue: 'Lalitpur' }),
  makeEvent({ id: 'd', title: 'Folk Gathering', bucket: 'completed', isPurchasable: false, venue: 'Bhaktapur' }),
]

const chip = (name: RegExp) => screen.getByRole('button', { name })
const searchBox = () => screen.getByRole('searchbox', { name: /search events/i })
const search = (value: string) => fireEvent.change(searchBox(), { target: { value } })

/** Title of the featured panel, or null when it is suppressed. */
const featuredTitle = () =>
  screen.queryAllByRole('heading', { level: 2 })[0]?.textContent?.trim() ?? null

/** Titles of the grid cards, in render order. */
const gridTitles = () =>
  screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent?.trim() ?? '')

describe('EventsBrowser — filters', () => {
  it('defaults to Upcoming, features the soonest show, and does not repeat it in the grid', () => {
    render(<EventsBrowser events={EVENTS} />)

    expect(featuredTitle()).toBe('Jazz Night')
    expect(gridTitles()).toEqual(['Rock Revival'])
  })

  it('narrows the grid to the selected bucket', () => {
    render(<EventsBrowser events={EVENTS} />)

    fireEvent.click(chip(/^Completed/))

    expect(gridTitles()).toEqual(['Folk Gathering'])
    expect(featuredTitle()).toBeNull()
  })

  it('renders no chip for an empty bucket', () => {
    render(<EventsBrowser events={EVENTS.filter((e) => e.bucket !== 'completed')} />)

    expect(screen.queryByRole('button', { name: /^Completed/ })).toBeNull()
    expect(chip(/^Past/)).toBeInTheDocument()
  })

  it('omits the whole controls row for a single event', () => {
    render(<EventsBrowser events={[EVENTS[0]]} />)

    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.queryByRole('button', { name: /^All/ })).toBeNull()
  })

  it('keeps search but drops chips when every event is in one bucket', () => {
    render(<EventsBrowser events={EVENTS.filter((e) => e.bucket === 'upcoming')} />)

    expect(searchBox()).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Upcoming/ })).toBeNull()
  })
})

describe('EventsBrowser — search', () => {
  it('matches titles case-insensitively', () => {
    render(<EventsBrowser events={EVENTS} />)

    fireEvent.click(chip(/^All/))
    search('JaZz')

    expect(gridTitles().sort()).toEqual(['Jazz Night', 'Jazz Reunion'])
  })

  it('matches on venue as well as title', () => {
    render(<EventsBrowser events={EVENTS} />)

    fireEvent.click(chip(/^All/))
    search('bhaktapur')

    expect(gridTitles()).toEqual(['Folk Gathering'])
  })

  it('intersects with the active filter rather than replacing it', () => {
    render(<EventsBrowser events={EVENTS} />)

    // "jazz" matches one upcoming and one past event, but Upcoming is active.
    search('jazz')

    expect(gridTitles()).toEqual(['Jazz Night'])
  })

  it('updates chip counts to reflect the query', () => {
    render(<EventsBrowser events={EVENTS} />)

    search('jazz')

    expect(chip(/^All/)).toHaveTextContent('2')
    expect(chip(/^Upcoming/)).toHaveTextContent('1')
    expect(chip(/^Past/)).toHaveTextContent('1')
  })

  it('disables a zero-match chip instead of removing it', () => {
    render(<EventsBrowser events={EVENTS} />)

    search('jazz')

    expect(chip(/^Completed/)).toBeDisabled()
  })

  it('suppresses the featured panel while searching', () => {
    render(<EventsBrowser events={EVENTS} />)
    expect(featuredTitle()).toBe('Jazz Night')

    search('jazz')

    // Jazz Night becomes an ordinary grid card rather than the featured panel.
    expect(featuredTitle()).toBeNull()
    expect(gridTitles()).toEqual(['Jazz Night'])
  })

  it('offers a working clear action when nothing matches', () => {
    render(<EventsBrowser events={EVENTS} />)

    search('nothingmatchesthis')
    expect(screen.getByText(/No events match/)).toBeInTheDocument()
    expect(gridTitles()).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: /^clear search$/i }))

    expect(screen.queryByText(/No events match/)).toBeNull()
    expect(featuredTitle()).toBe('Jazz Night')
  })
})
