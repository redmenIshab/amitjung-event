import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateMusicSchema } from '@/types/music'

export async function GET(_request: Request, { params }: { params: Promise<{ artistId: string; musicId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { artistId, musicId } = await params

    const music = await prisma.music.findUnique({
      where: { id: musicId },
    })

    if (!music || music.artistId !== artistId || music.deletedAt) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(music)
  } catch (e) {
    console.error('GET /api/artist/[artistId]/music/[musicId]:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ artistId: string; musicId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { artistId, musicId } = await params
    const body = await request.json()
    const parsed = updateMusicSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }

    const existing = await prisma.music.findUnique({ where: { id: musicId } })
    if (!existing || existing.artistId !== artistId || existing.deletedAt) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const music = await prisma.music.update({
      where: { id: musicId },
      data: parsed.data,
    })

    return NextResponse.json(music)
  } catch (e) {
    console.error('PATCH /api/artist/[artistId]/music/[musicId]:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ artistId: string; musicId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { artistId, musicId } = await params

    const existing = await prisma.music.findUnique({ where: { id: musicId } })
    if (!existing || existing.artistId !== artistId || existing.deletedAt) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await prisma.music.update({
      where: { id: musicId },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ message: 'Deleted' })
  } catch (e) {
    console.error('DELETE /api/artist/[artistId]/music/[musicId]:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
