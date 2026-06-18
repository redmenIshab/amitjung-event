import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { updateEventSchema } from '@/lib/validations'

type Params = { params: Promise<{ eventId: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { eventId } = await params
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: { select: { tickets: true } },
        artist: {
          include: {
            musics: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'asc' },
              select: { id: true, musicTitle: true },
            },
          },
        },
      },
    })
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(event)
  } catch (e) {
    console.error('GET /api/events/[eventId]:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { eventId } = await params
  const body = await request.json()
  const parsed = updateEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.date) data.date = new Date(parsed.data.date)

  const event = await prisma.event.update({ where: { id: eventId }, data })
  return NextResponse.json(event)
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { eventId } = await params
  await prisma.event.delete({ where: { id: eventId } })
  return new NextResponse(null, { status: 204 })
}
