import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { updateEventSchema } from '@/lib/validations'
import { getCachedEvent, invalidateEventCache } from '@/lib/upstash/services/event-cache'

type Params = { params: Promise<{ eventId: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { eventId } = await params
    const event = await getCachedEvent(eventId)
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json(event)
  } catch (e) {
    console.error('GET /api/events/[eventId]:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const gate = await requireApiCapability('EVENT_WRITE')
  if (gate instanceof NextResponse) return gate

  const { eventId } = await params
  const body = await request.json()
  const parsed = updateEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const data: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.date) data.date = new Date(parsed.data.date)

  const event = await prisma.event.update({ where: { id: eventId }, data })

  await invalidateEventCache(eventId)

  return NextResponse.json(event)
}

export async function DELETE(_req: Request, { params }: Params) {
  const gate = await requireApiCapability('EVENT_WRITE')
  if (gate instanceof NextResponse) return gate

  const { eventId } = await params
  await prisma.event.delete({ where: { id: eventId } })

  await invalidateEventCache(eventId)

  return new NextResponse(null, { status: 204 })
}
