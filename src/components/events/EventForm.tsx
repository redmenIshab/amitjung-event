'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function EventForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = new FormData(e.currentTarget)
    const payload = {
      name: form.get('name') as string,
      venue: form.get('venue') as string,
      date: new Date(form.get('date') as string).toISOString(),
      capacity: parseInt(form.get('capacity') as string, 10),
      description: form.get('description') as string,
      isOpen: form.get('isOpen') === 'on',
    }

    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const event = await res.json()
      router.push(`/events/${event.id}`)
      router.refresh()
    } else {
      const data = await res.json()
      setError(typeof data.error === 'string' ? data.error : 'Failed to create event')
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
