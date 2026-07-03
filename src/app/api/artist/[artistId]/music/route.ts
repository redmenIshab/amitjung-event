import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createMusicSchema } from '@/types/music'

export async function GET(_request: Request, { params }: { params: Promise<{ artistId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { artistId } = await params

    const musics = await prisma.music.findMany({
      where: { artistId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(musics)
  } catch (e) {
    console.error('GET /api/artist/[artistId]/music:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ artistId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { artistId } = await params

    const existing = await prisma.artist.findUnique({ where: { id: artistId } })
    if (!existing || existing.deletedAt) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    const body = await request.json()
    const parsed = createMusicSchema.safeParse({ ...body, artistId })

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const music = await prisma.music.create({ data: parsed.data })

    return NextResponse.json(music, { status: 201 })
  } catch (e) {
    console.error('POST /api/artist/[artistId]/music:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
