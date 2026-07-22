import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { updateEventSchema } from '@/lib/validations'
import { isCompletableDate } from '@/lib/events'
import { getCachedEvent, invalidateEventCache } from '@/lib/upstash/services/event-cache'

type Params = { params: Promise<{ eventId: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { eventId } = await params
    const event = await getCachedEvent(eventId)
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Live non-cancelled sold count (not from the day-long cache).
    const soldCount = await prisma.ticket.count({
      where: { eventId, status: { not: 'CANCELLED' } },
    })

    return NextResponse.json({ ...event, soldCount })
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

  const { date, discountUpto, ...rest } = parsed.data
  const data: Record<string, unknown> = { ...rest }
  if (date) data.bookingDeadline = new Date(date)
  if (discountUpto) data.discountUpto = new Date(discountUpto)

  // Guard the COMPLETED transition: an event can only be marked completed once
  // its date is today or in the past. Use the incoming date if present, else the
  // event's stored booking deadline.
  if (parsed.data.status === 'COMPLETED') {
    const existing = await prisma.event.findUnique({
      where: { id: eventId },
      select: { bookingDeadline: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const effectiveDate = date ? new Date(date) : existing.bookingDeadline
    if (!isCompletableDate(effectiveDate)) {
      return NextResponse.json(
        { error: 'An event can only be marked completed once its date is today or in the past' },
        { status: 422 },
      )
    }
  }

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
