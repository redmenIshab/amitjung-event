import { LayoutDashboard, Calendar, ScanLine, Music, Users, type LucideIcon } from 'lucide-react'
import { hasCapability, type AppRole, type Capability } from '@/lib/rbac'

export interface AdminNavLink {
  href: string
  label: string
  icon: LucideIcon
  /** When set, the link is hidden from roles lacking this capability. */
  cap?: Capability
}

/**
 * Control Center navigation, shared by the desktop sidebar and the mobile
 * drawer so the two cannot drift apart.
 */
export const ADMIN_NAV_LINKS: AdminNavLink[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/scanner', label: 'Scanner', icon: ScanLine, cap: 'TICKET_SCAN' },
  { href: '/admin/artists', label: 'Artists', icon: Music, cap: 'ARTIST_READ' },
  { href: '/admin/users', label: 'Users', icon: Users, cap: 'USER_MANAGE' },
]

/** Links visible to a role. Hiding is cosmetic — the routes enforce their own gates. */
export function navLinksFor(role: AppRole): AdminNavLink[] {
  return ADMIN_NAV_LINKS.filter((l) => !l.cap || hasCapability(role, l.cap))
}
