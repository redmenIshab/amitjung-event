import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { updateArtistSchema } from '@/types/artist'

export async function GET(_request: Request, { params }: { params: Promise<{ artistId: string }> }) {
  const gate = await requireApiCapability('ARTIST_READ')
  if (gate instanceof NextResponse) return gate

  const { artistId } = await params

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    include: { _count: { select: { events: true } } },
  })

  if (!artist || artist.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(artist)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ artistId: string }> }) {
  const gate = await requireApiCapability('ARTIST_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { artistId } = await params
  const body = await request.json()
  const parsed = updateArtistSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const existing = await prisma.artist.findUnique({ where: { id: artistId } })
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const artist = await prisma.artist.update({
    where: { id: artistId },
    data: parsed.data,
  })

  return NextResponse.json(artist)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ artistId: string }> }) {
  const gate = await requireApiCapability('ARTIST_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { artistId } = await params

  const existing = await prisma.artist.findUnique({ where: { id: artistId } })
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.artist.update({
    where: { id: artistId },
    data: { deletedAt: new Date() },
  })

  return NextResponse.json({ message: 'Deleted' })
}
