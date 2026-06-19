'use server'

import { redisConfig } from '@/lib/upstash/upstash'
import { processBookingQueue } from '@/lib/ticketing'

export async function checkBookingStatus(jobId: string) {
  const raw = await redisConfig.get(`booking:result:${jobId}`)
  if (raw) {
    if (typeof raw === 'string') return JSON.parse(raw)
    return raw as { status: string; bookingId?: string; reference?: string; error?: string }
  }

  const jobRaw = await redisConfig.get(`booking:job:${jobId}`)
  if (!jobRaw) {
    return { status: 'error', error: 'Booking data expired' }
  }

  const jobData = typeof jobRaw === 'string' ? JSON.parse(jobRaw) : jobRaw as { eventId: string }
  await processBookingQueue(jobData.eventId)

  const resultRaw = await redisConfig.get(`booking:result:${jobId}`)
  if (resultRaw) {
    if (typeof resultRaw === 'string') return JSON.parse(resultRaw)
    return resultRaw as { status: string; bookingId?: string; reference?: string; error?: string }
  }

  return { status: 'pending' }
}
