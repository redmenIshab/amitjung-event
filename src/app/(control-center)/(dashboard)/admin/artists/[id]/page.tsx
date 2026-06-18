'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Music } from 'lucide-react'

export default function EditArtistPage() {
  const router = useRouter()
  const params = useParams()
  const [form, setForm] = useState({
    artistName: '',
    artistImage: '',
    artistBand: '',
    artistDescription: '',
  })
  const [genres, setGenres] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    fetch(`/api/artist/${params.id}`)
      .then((r) => {
        if (r.status === 403) router.push('/login')
        if (r.status === 404) router.push('/admin/artists')
        return r.json()
      })
      .then((data) => {
        setForm({
          artistName: data.artistName,
          artistImage: data.artistImage,
          artistBand: data.artistBand,
          artistDescription: data.artistDescription,
        })
        setGenres(data.artistGenere.join(', '))
        setLoadingData(false)
      })
  }, [params.id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const genreList = genres
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean)

    const res = await fetch(`/api/artist/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, artistGenere: genreList }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error?.formErrors?.join(', ') ?? data.error ?? 'Failed to update')
      setLoading(false)
      return
    }

    router.push('/admin/artists')
    router.refresh()
  }

  if (loadingData) {
    return <p className="text-gray-500 text-center py-8">Loading…</p>
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Edit Artist</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="artistName">Name</Label>
              <Input
                id="artistName"
                value={form.artistName}
                onChange={(e) => setForm({ ...form, artistName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="artistImage">Image URL</Label>
              <Input
                id="artistImage"
                type="url"
                value={form.artistImage}
                onChange={(e) => setForm({ ...form, artistImage: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="artistBand">Band</Label>
              <Input
                id="artistBand"
                value={form.artistBand}
                onChange={(e) => setForm({ ...form, artistBand: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="artistDescription">Description</Label>
              <textarea
                id="artistDescription"
                value={form.artistDescription}
                onChange={(e) => setForm({ ...form, artistDescription: e.target.value })}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="genres">Genres (comma-separated)</Label>
              <Input
                id="genres"
                value={genres}
                onChange={(e) => setGenres(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Link href={`/admin/artists/${params.id}/music`}>
        <Button variant="outline" className="w-full mt-4">
          <Music size={16} />
          Manage Songs
        </Button>
      </Link>
    </div>
  )
}
