import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createArtistSchema } from '@/types/artist'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const artists = await prisma.artist.findMany({
    where: { deletedAt: null },
    orderBy: { artistName: 'asc' },
    include: { _count: { select: { events: true } } },
  })

  return NextResponse.json(artists)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = createArtistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const artist = await prisma.artist.create({ data: parsed.data })

  return NextResponse.json(artist, { status: 201 })
}
