// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
// tests/setup.ts does not register jest-dom (it runs for node-env tests too),
// so the DOM matchers are pulled in here.
import '@testing-library/jest-dom/vitest'

import { EventCard, type EventCardData } from '@/components/events/EventCard'

const base: EventCardData = {
  id: 'evt-1',
  title: 'Sangeet Chowk Festival',
  image: '/poster.jpg',
  artistImage: '',
  venue: 'Sangeet Chowk',
  date: '2026-09-01T00:00:00.000Z',
  eventType: 'FESTIVAL',
  badges: [],
  bucket: 'upcoming',
  isPurchasable: true,
  soldOut: false,
}

const card = (over: Partial<EventCardData> = {}) => render(<EventCard event={{ ...base, ...over }} />)

const buyLink = () => screen.queryByRole('link', { name: /buy tickets/i })
const detailsLink = (title = base.title) => screen.getByRole('link', { name: title })

describe('EventCard', () => {
  it('exposes both a buy link and a details link when purchasable', () => {
    card()

    expect(buyLink()).toHaveAttribute('href', '/booking/evt-1/checkout')
    expect(detailsLink()).toHaveAttribute('href', '/events/evt-1')
  })

  it('renders the buy action as a filled gold button', () => {
    card()

    expect(buyLink()).toHaveClass('bg-gold')
  })

  it('keeps past events navigable, with no action slot at all', () => {
    card({ bucket: 'past', isPurchasable: false })

    expect(buyLink()).toBeNull()
    expect(detailsLink()).toHaveAttribute('href', '/events/evt-1')
    expect(screen.getByText('Ended')).toBeInTheDocument()
    // A finished event gets no purchase affordance — not even a muted one.
    expect(screen.queryByText('Sales Closed')).toBeNull()
    expect(screen.queryByText('Sold Out')).toBeNull()
  })

  it('badges a completed event without desaturating its artwork', () => {
    const { container } = card({ bucket: 'completed', isPurchasable: false })

    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(buyLink()).toBeNull()
    expect(screen.queryByText('Sales Closed')).toBeNull()
    // Regression guard on QA finding 5 — grayscale made completed events read as disabled.
    expect(container.querySelector('.grayscale')).toBeNull()
    expect(container.querySelector('.cursor-not-allowed')).toBeNull()
  })

  it('tells an upcoming event why it cannot be bought', () => {
    card({ bucket: 'upcoming', isPurchasable: false, soldOut: true })

    expect(buyLink()).toBeNull()
    // Still upcoming, so the reason is worth surfacing where the button would be.
    expect(screen.getByText('Sold Out')).toHaveClass('min-h-11')
  })
})
