// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
// tests/setup.ts does not register jest-dom (it runs for node-env tests too),
// so the DOM matchers are pulled in here.
import '@testing-library/jest-dom/vitest'

const usePathname = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ usePathname }))

import { AccountHeader } from '@/components/tickets/AccountHeader'

const tab = (label: string) => screen.getByRole('link', { name: label })

describe('AccountHeader', () => {
  beforeEach(() => usePathname.mockReset())

  it('renders both account tabs', () => {
    usePathname.mockReturnValue('/profile')
    render(<AccountHeader title="Profile" />)

    expect(tab('Profile')).toHaveAttribute('href', '/profile')
    expect(tab('My Tickets')).toHaveAttribute('href', '/tickets')
  })

  it('marks Profile current on /profile', () => {
    usePathname.mockReturnValue('/profile')
    render(<AccountHeader title="Profile" />)

    expect(tab('Profile')).toHaveAttribute('aria-current', 'page')
    expect(tab('My Tickets')).not.toHaveAttribute('aria-current')
  })

  it('marks My Tickets current on /tickets', () => {
    usePathname.mockReturnValue('/tickets')
    render(<AccountHeader title="My Tickets" />)

    expect(tab('My Tickets')).toHaveAttribute('aria-current', 'page')
    expect(tab('Profile')).not.toHaveAttribute('aria-current')
  })

  it.each([
    '/tickets/evt_123',
    '/tickets/evt_123/tkt_456',
  ])('keeps My Tickets current on the drill-down %s', (path) => {
    usePathname.mockReturnValue(path)
    render(<AccountHeader title="My Tickets" />)

    expect(tab('My Tickets')).toHaveAttribute('aria-current', 'page')
  })

  it('does not treat /profile as active while on tickets', () => {
    usePathname.mockReturnValue('/tickets/evt_123')
    render(<AccountHeader title="My Tickets" />)

    expect(tab('Profile')).not.toHaveAttribute('aria-current')
  })

  it('shows the page title passed in', () => {
    usePathname.mockReturnValue('/profile')
    render(<AccountHeader title="Profile" />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Profile')
  })
})
