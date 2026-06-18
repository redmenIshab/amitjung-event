'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'

export default function EditMusicPage() {
  const router = useRouter()
  const params = useParams()
  const artistId = params.id as string
  const musicId = params.musicId as string
  const [musicTitle, setMusicTitle] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    fetch(`/api/artist/${artistId}/music/${musicId}`)
      .then((r) => {
        if (r.status === 403) router.push('/login')
        if (r.status === 404) router.push(`/admin/artists/${artistId}/music`)
        return r.json()
      })
      .then((data) => {
        setMusicTitle(data.musicTitle)
        setLoadingData(false)
      })
  }, [artistId, musicId, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch(`/api/artist/${artistId}/music/${musicId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ musicTitle }),
    })

    if (!res.ok) {
      let message = 'Failed to update'
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

  if (loadingData) {
    return <p className="text-gray-500 text-center py-8">Loading…</p>
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
          <CardTitle>Edit Song</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="musicTitle">Song Title</Label>
              <Input
                id="musicTitle"
                value={musicTitle}
                onChange={(e) => setMusicTitle(e.target.value)}
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
    </div>
  )
}
