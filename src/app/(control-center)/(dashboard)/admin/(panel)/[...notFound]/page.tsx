import { redirect } from 'next/navigation'

// Any unmatched /admin/* route (for an authenticated admin) → the dashboard.
export default function AdminNotFound() {
  redirect('/admin/dashboard')
}
