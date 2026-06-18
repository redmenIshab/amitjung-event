'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Pencil, Trash2, Plus } from 'lucide-react'

type Artist = {
  id: string
  artistName: string
  artistImage: string
  artistBand: string
  artistDescription: string
  artistGenere: string[]
  _count: { events: number }
}

export default function ArtistsPage() {
  const router = useRouter()
  const [artists, setArtists] = useState<Artist[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/artist')
      .then((r) => {
        if (r.status === 403) router.push('/login')
        return r.json()
      })
      .then(setArtists)
  }, [router])

  const filtered = artists.filter((a) =>
    a.artistName.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleDelete(id: string) {
    if (!confirm('Delete this artist?')) return
    await fetch(`/api/artist/${id}`, { method: 'DELETE' })
    setArtists((prev) => prev.filter((a) => a.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Artists</h1>
        <Link href="/admin/artists/new">
          <Button>
            <Plus size={16} />
            New Artist
          </Button>
        </Link>
      </div>

      <Input
        placeholder="Search artists..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {filtered.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No artists found.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Band</TableHead>
                <TableHead>Genres</TableHead>
                <TableHead>Events</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((artist) => (
                <TableRow key={artist.id}>
                  <TableCell>
                    <img
                      src={artist.artistImage}
                      alt={artist.artistName}
                      className="w-10 h-10 rounded-full object-cover bg-gray-100"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{artist.artistName}</TableCell>
                  <TableCell>{artist.artistBand}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {artist.artistGenere.map((g) => (
                        <span
                          key={g}
                          className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase font-semibold tracking-wider"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>{artist._count.events}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/artists/${artist.id}`}>
                        <Button variant="outline" size="icon">
                          <Pencil size={14} />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(artist.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
