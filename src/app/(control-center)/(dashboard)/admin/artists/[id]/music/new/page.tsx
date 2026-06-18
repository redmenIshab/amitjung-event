'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function NewMusicPage() {
  const router = useRouter()
  const params = useParams()
  const artistId = params.id as string
  const [musicTitle, setMusicTitle] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch(`/api/artist/${artistId}/music`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ musicTitle }),
    })

    if (!res.ok) {
      let message = 'Failed to create'
      try {
        const data = await res.json()
        message = data.error?.formErrors?.join(', ') ?? data.error ?? message
      } catch {}
      setError(message)
      setLoading(false)
      return
    }

    router.push(`/admin/artists/${artistId}/music`)
    router.refresh()
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-4">
        <Link href={`/admin/artists/${artistId}/music`}>
          <Button variant="outline" size="sm">
            <ArrowLeft size={14} />
            Back
          </Button>
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New Song</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="musicTitle">Song Title</Label>
              <Input
                id="musicTitle"
                value={musicTitle}
                onChange={(e) => setMusicTitle(e.target.value)}
                placeholder="Enter song title"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating…' : 'Create Song'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
