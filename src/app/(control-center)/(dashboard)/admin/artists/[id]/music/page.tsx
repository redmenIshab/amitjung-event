'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
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
import { Pencil, Trash2, Plus, ArrowLeft } from 'lucide-react'

type Music = {
  id: string
  musicTitle: string
  createdAt: string
}

export default function MusicListPage() {
  const router = useRouter()
  const params = useParams()
  const artistId = params.id as string
  const [musics, setMusics] = useState<Music[]>([])
  const [search, setSearch] = useState('')
  const [artistName, setArtistName] = useState('')

  useEffect(() => {
    fetch(`/api/artist/${artistId}`)
      .then((r) => {
        if (r.status === 403) router.push('/login')
        return r.json()
      })
      .then((data) => setArtistName(data.artistName))

    fetch(`/api/artist/${artistId}/music`)
      .then((r) => {
        if (r.status === 403) router.push('/login')
        return r.json()
      })
      .then(setMusics)
  }, [artistId, router])

  const filtered = musics.filter((m) =>
    m.musicTitle.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleDelete(id: string) {
    if (!confirm('Delete this song?')) return
    await fetch(`/api/artist/${artistId}/music/${id}`, { method: 'DELETE' })
    setMusics((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/admin/artists/${artistId}`}>
            <Button variant="outline" size="icon">
              <ArrowLeft size={16} />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Songs</h1>
            {artistName && (
              <p className="text-sm text-gray-500">{artistName}</p>
            )}
          </div>
        </div>
        <Link href={`/admin/artists/${artistId}/music/new`}>
          <Button>
            <Plus size={16} />
            New Song
          </Button>
        </Link>
      </div>

      <Input
        placeholder="Search songs..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />

      {filtered.length === 0 ? (
        <p className="text-gray-500 py-8 text-center">No songs found.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Added</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((music) => (
                <TableRow key={music.id}>
                  <TableCell className="font-medium">{music.musicTitle}</TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(music.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/admin/artists/${artistId}/music/${music.id}`}>
                        <Button variant="outline" size="icon">
                          <Pencil size={14} />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(music.id)}
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
