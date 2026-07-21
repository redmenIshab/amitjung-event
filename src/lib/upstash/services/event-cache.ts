import { get, upsert } from '../orm/crud'
import { redisConfig } from '../upstash'
import { prisma } from '@/lib/prisma'

const TTL = 86_400
const KEY_VERSION = 'v2'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CachedEvent = Record<string, any> & {
  id: string
  name: string
  venue: string
  date: string
}

function cacheKey(base: string) {
  return `${base}:${KEY_VERSION}`
}

function transformEvent(event: Record<string, unknown>): CachedEvent {
  return {
    ...event,
    date: (event.bookingDeadline as Date).toISOString(),
  } as CachedEvent
}

export async function getCachedEvents(): Promise<CachedEvent[]> {
  const key = cacheKey('events:list')
  const cached = await get<CachedEvent[]>({ key })
  if (cached !== null) return cached

  const events = await prisma.event.findMany({
    orderBy: { bookingDeadline: 'asc' },
    include: {
      _count: { select: { tickets: true } },
      artist: true,
    },
  })

  const transformed = events.map(transformEvent)
  await upsert({ key, data: transformed, ttl: TTL })
  return transformed
}

export async function getCachedEvent(eventId: string): Promise<CachedEvent | null> {
  const key = cacheKey(`events:${eventId}`)
  const cached = await get<CachedEvent>({ key })
  if (cached !== null) return cached

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

  if (!event) return null

  const transformed = transformEvent(event)
  await upsert({ key, data: transformed, ttl: TTL })
  return transformed
}

export async function getCachedUpcomingEvents(): Promise<CachedEvent[]> {
  const key = cacheKey('events:upcoming')
  const cached = await get<CachedEvent[]>({ key })
  if (cached !== null) return cached

  const events = await prisma.event.findMany({
    where: { bookingDeadline: { gte: new Date() } },
    orderBy: { bookingDeadline: 'asc' },
    take: 5,
    include: { _count: { select: { tickets: true } } },
  })

  const transformed = events.map(transformEvent)
  await upsert({ key, data: transformed, ttl: TTL })
  return transformed
}

export async function invalidateEventCache(eventId?: string) {
  const keys = [cacheKey('events:list'), cacheKey('events:upcoming')]
  if (eventId) keys.push(cacheKey(`events:${eventId}`))
  await Promise.all(keys.map((key) => redisConfig.del(key)))
}
