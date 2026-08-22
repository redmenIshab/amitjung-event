import { describe, it, expect } from 'vitest'
import { navLinksFor } from '@/components/layout/adminNavLinks'
import type { AppRole } from '@/lib/rbac'

const hrefs = (role: AppRole) => navLinksFor(role).map((l) => l.href)

describe('navLinksFor', () => {
  it('gives ORGANIZER only dashboard, events and scanner', () => {
    expect(hrefs('ORGANIZER')).toEqual(['/admin/dashboard', '/admin/events', '/admin/scanner'])
  })

  it('leaves ADMIN with every link', () => {
    expect(hrefs('ADMIN')).toEqual([
      '/admin/dashboard',
      '/admin/events',
      '/admin/scanner',
      '/admin/artists',
      '/admin/users',
    ])
  })

  it('keeps artists visible to STAFF and MANAGER', () => {
    expect(hrefs('STAFF')).toContain('/admin/artists')
    expect(hrefs('MANAGER')).toContain('/admin/artists')
  })

  it('still hides the scanner from MANAGER', () => {
    expect(hrefs('MANAGER')).not.toContain('/admin/scanner')
  })

  it('hides user administration from everyone but ADMIN', () => {
    for (const role of ['STAFF', 'MANAGER', 'ORGANIZER'] as AppRole[]) {
      expect(hrefs(role)).not.toContain('/admin/users')
    }
  })
})
