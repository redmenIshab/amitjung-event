'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isCompletableDate } from '@/lib/events'

export type EventForEdit = {
  id: string
  name: string
  venue: string
  bookingDeadline: string
  capacity: number
  ticketsAvailable: number
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'
  eventType: string
  baseTicketPrice: number
  hasDiscount: boolean
  discountPercentage: number
  discountUpto: string | null
  description: string | null
  isOpen: boolean
  image: string | null
  genres: string[]
  artistId: string | null
}

function toLocalInput(iso?: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function EditEventForm({ event }: { event: EventForEdit }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const hasDiscount = form.get('hasDiscount') === 'on'
    const payload = {
      name: form.get('name') as string,
      venue: form.get('venue') as string,
      date: new Date(form.get('date') as string).toISOString(),
      capacity: parseInt(form.get('capacity') as string, 10),
      ticketsAvailable: parseInt(form.get('ticketsAvailable') as string, 10),
      status: form.get('status') as string,
      eventType: form.get('eventType') as string,
      baseTicketPrice: parseInt(form.get('baseTicketPrice') as string, 10),
      hasDiscount,
      discountPercentage: hasDiscount ? parseInt(form.get('discountPercentage') as string, 10) : 0,
      discountUpto: hasDiscount ? new Date(form.get('discountUpto') as string).toISOString() : undefined,
      description: (form.get('description') as string) || undefined,
      isOpen: form.get('isOpen') === 'on',
      image: (form.get('image') as string) || undefined,
      genres: ((form.get('genres') as string) ?? '')
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean),
    }

    if (payload.status === 'COMPLETED' && !isCompletableDate(payload.date)) {
      setError('An event can only be marked completed once its date is today or in the past')
      setLoading(false)
      return
    }

    const res = await fetch(`/api/events/${event.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      router.push(`/admin/events/${event.id}`)
      router.refresh()
    } else {
      let message = 'Failed to update event'
      try {
        const data = await res.json()
        message = typeof data.error === 'string' ? data.error : message
      } catch {}
      setError(message)
      setLoading(false)
    }
  }

  const selectCls =
    'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm'

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Event Name</Label>
        <Input id="name" name="name" defaultValue={event.name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="venue">Venue</Label>
        <Input id="venue" name="venue" defaultValue={event.venue} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="date">Date &amp; Time</Label>
        <Input id="date" name="date" type="datetime-local" defaultValue={toLocalInput(event.bookingDeadline)} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="capacity">Capacity</Label>
        <Input id="capacity" name="capacity" type="number" min="1" defaultValue={event.capacity} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="ticketsAvailable">Tickets Available for Sale</Label>
        <Input id="ticketsAvailable" name="ticketsAvailable" type="number" min="1" defaultValue={event.ticketsAvailable} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="status">Status</Label>
        <select id="status" name="status" defaultValue={event.status} className={selectCls}>
          <option value="DRAFT">Draft (hidden from public)</option>
          <option value="PUBLISHED">Published (on sale)</option>
          <option value="COMPLETED">Completed (event concluded)</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="eventType">Event Type</Label>
        <select id="eventType" name="eventType" defaultValue={event.eventType} className={selectCls}>
          <option value="CONCERT">Concert</option>
          <option value="FESTIVAL">Festival</option>
          <option value="CONFERENCE">Conference</option>
          <option value="SPORTS">Sports</option>
          <option value="PRIVATE">Private</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="baseTicketPrice">Ticket Price (cents)</Label>
        <Input id="baseTicketPrice" name="baseTicketPrice" type="number" min="0" defaultValue={event.baseTicketPrice} required />
      </div>
      <div className="flex items-center gap-2">
        <input id="hasDiscount" name="hasDiscount" type="checkbox" defaultChecked={event.hasDiscount} className="h-4 w-4" />
        <Label htmlFor="hasDiscount">Enable early-bird discount</Label>
      </div>
      <div className="space-y-1">
        <Label htmlFor="discountPercentage">Discount (%)</Label>
        <Input id="discountPercentage" name="discountPercentage" type="number" min="0" max="100" defaultValue={event.discountPercentage} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="discountUpto">Discount valid until</Label>
        <Input id="discountUpto" name="discountUpto" type="datetime-local" defaultValue={toLocalInput(event.discountUpto)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="image">Poster Image URL (optional)</Label>
        <Input id="image" name="image" type="url" defaultValue={event.image ?? ''} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="genres">Genres (comma-separated, optional)</Label>
        <Input id="genres" name="genres" defaultValue={event.genres.join(', ')} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description (optional)</Label>
        <Input id="description" name="description" defaultValue={event.description ?? ''} />
      </div>
      <div className="flex items-center gap-2">
        <input id="isOpen" name="isOpen" type="checkbox" defaultChecked={event.isOpen} className="h-4 w-4" />
        <Label htmlFor="isOpen">Open for public self-registration</Label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
