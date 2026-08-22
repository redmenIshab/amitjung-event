import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { createArtistSchema } from '@/types/artist'

export async function GET() {
  const gate = await requireApiCapability('ARTIST_READ')
  if (gate instanceof NextResponse) return gate

  const artists = await prisma.artist.findMany({
    where: { deletedAt: null },
    orderBy: { artistName: 'asc' },
    include: { _count: { select: { events: true } } },
  })

  return NextResponse.json(artists)
}

export async function POST(request: Request) {
  const gate = await requireApiCapability('ARTIST_MANAGE')
  if (gate instanceof NextResponse) return gate

  const body = await request.json()
  const parsed = createArtistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const artist = await prisma.artist.create({ data: parsed.data })

  return NextResponse.json(artist, { status: 201 })
}
