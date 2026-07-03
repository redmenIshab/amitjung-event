'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Artist = { id: string; artistName: string }

export function EventForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [artists, setArtists] = useState<Artist[]>([])

  useEffect(() => {
    fetch('/api/artist')
      .then((r) => r.json())
      .then(setArtists)
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const genresRaw = (form.get('genres') as string) ?? ''
    const payload = {
      name: form.get('name') as string,
      venue: form.get('venue') as string,
      date: new Date(form.get('date') as string).toISOString(),
      capacity: parseInt(form.get('capacity') as string, 10),
      baseTicketPrice: parseInt(form.get('baseTicketPrice') as string, 10),
      hasDiscount: form.get('hasDiscount') === 'on',
      discountPercentage: form.get('hasDiscount') === 'on'
        ? parseInt(form.get('discountPercentage') as string, 10)
        : 0,
      discountUpto: form.get('hasDiscount') === 'on'
        ? new Date(form.get('discountUpto') as string).toISOString()
        : undefined,
      description: (form.get('description') as string) || undefined,
      isOpen: form.get('isOpen') === 'on',
      image: (form.get('image') as string) || undefined,
      genres: genresRaw
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean),
      artistId: (form.get('artistId') as string) || undefined,
    }

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      let event: { id: string }
      try {
        event = await res.json()
      } catch {
        setError('Failed to create event')
        setLoading(false)
        return
      }
      router.push(`/events/${event.id}`)
      router.refresh()
    } else {
      let message = 'Failed to create event'
      try {
        const data = await res.json()
        message = typeof data.error === 'string' ? data.error : message
      } catch {}
      setError(message)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Event Name</Label>
        <Input id="name" name="name" placeholder="Summer Beats Festival" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="venue">Venue</Label>
        <Input id="venue" name="venue" placeholder="Social Cafe, SangeetChowk Itahari" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="date">Date &amp; Time</Label>
        <Input id="date" name="date" type="datetime-local" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="capacity">Capacity</Label>
        <Input id="capacity" name="capacity" type="number" min="1" placeholder="500" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="baseTicketPrice">Ticket Price (cents)</Label>
        <Input id="baseTicketPrice" name="baseTicketPrice" type="number" min="0" placeholder="4500" required />
      </div>
      <div className="flex items-center gap-2">
        <input id="hasDiscount" name="hasDiscount" type="checkbox" className="h-4 w-4" />
        <Label htmlFor="hasDiscount">Enable early-bird discount</Label>
      </div>
      <div className="space-y-1">
        <Label htmlFor="discountPercentage">Discount (%)</Label>
        <Input id="discountPercentage" name="discountPercentage" type="number" min="0" max="100" placeholder="20" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="discountUpto">Discount valid until</Label>
        <Input id="discountUpto" name="discountUpto" type="datetime-local" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="image">Poster Image URL (optional)</Label>
        <Input id="image" name="image" type="url" placeholder="https://example.com/poster.jpg" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="genres">Genres (comma-separated, optional)</Label>
        <Input id="genres" name="genres" placeholder="POP, R&B, LIVE" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="artistId">Artist (optional)</Label>
        <select
          id="artistId"
          name="artistId"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          <option value="">None</option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.artistName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description (optional)</Label>
        <Input id="description" name="description" placeholder="Brief event description" />
      </div>
      <div className="flex items-center gap-2">
        <input id="isOpen" name="isOpen" type="checkbox" defaultChecked className="h-4 w-4" />
        <Label htmlFor="isOpen">Open for public self-registration</Label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating…' : 'Create Event'}
      </Button>
    </form>
  )
}
