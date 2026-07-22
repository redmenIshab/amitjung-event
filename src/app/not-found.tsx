import { redirect } from 'next/navigation'

// Any unmatched public route → home.
export default function NotFound() {
  redirect('/')
}
