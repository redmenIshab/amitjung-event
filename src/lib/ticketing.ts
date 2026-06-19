import { prisma } from '@/lib/prisma'
import { generateQRCodeDataURL, buildVerifyUrl } from '@/lib/qr'
import { sendTicketEmail, isEmailEnabled } from '@/lib/email'
import { redisConfig } from '@/lib/upstash/upstash'

const SYSTEM_EMAIL = 'system@ticketing.internal'

export type AttendeeInput = {
  name: string
  email: string
  category: 'GENERAL' | 'VIP'
}

export type AmountsInput = {
  totalAmount: number
  discountAmount: number
  discountPercentage: number
  finalAmount: number
}

const SYSTEM_PARTICIPANT_ID = 'system-participant'

export async function getSystemParticipant() {
  let p = await prisma.participant.findUnique({ where: { email: SYSTEM_EMAIL } })
  if (!p) {
    p = await prisma.participant.create({
      data: {
        email: SYSTEM_EMAIL,
        name: 'System',
        googleId: `system:${SYSTEM_EMAIL}`,
      },
    })
  }
  return p
}

export async function ensureSystemBooking(eventId: string) {
  const system = await getSystemParticipant()

  const { bookingId } = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        totalAmount: 0,
        discountAmount: 0,
        discountPercentage: 0,
        finalAmount: 0,
        paymentStatus: 'PAID',
        paymentInitiatorId: system.id,
        eventId,
      },
    })

    const booking = await tx.booking.create({
      data: {
        quantity: 1,
        status: 'PAID',
        paymentId: payment.id,
        eventId,
        participantId: system.id,
      },
    })

    return { bookingId: booking.id }
  })

  return bookingId
}

export async function createBookingPipeline(
  eventId: string,
  participantId: string,
  attendees: AttendeeInput[],
  amounts: AmountsInput,
) {
  const event = await prisma.event.findUniqueOrThrow({ where: { id: eventId } })

  const { booking, tickets } = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        totalAmount: amounts.totalAmount,
        discountAmount: amounts.discountAmount,
        discountPercentage: amounts.discountPercentage,
        finalAmount: amounts.finalAmount,
        paymentStatus: 'PAID',
        paymentInitiatorId: participantId,
        eventId,
      },
    })

    const booking = await tx.booking.create({
      data: {
        quantity: attendees.length,
        status: 'PAID',
        paymentId: payment.id,
        eventId,
        participantId,
      },
    })

    const tickets = await Promise.all(
      attendees.map((a) =>
        tx.ticket.create({
          data: {
            eventId,
            bookingId: booking.id,
            attendeeName: a.name,
            attendeeEmail: a.email,
            category: a.category,
            source: 'SELF_REGISTERED',
          },
        }),
      ),
    )

    return { booking, tickets }
  })

  await Promise.allSettled(
    tickets.map(async (ticket) => {
      try {
        const verifyUrl = buildVerifyUrl(ticket.token)
        const qrCodeDataUrl = await generateQRCodeDataURL(verifyUrl)

        if (isEmailEnabled() && ticket.attendeeEmail) {
          await sendTicketEmail({
            to: ticket.attendeeEmail,
            attendeeName: ticket.attendeeName ?? '',
            eventName: event.name,
            eventDate: event.bookingDeadline,
            eventVenue: event.venue,
            qrCodeDataUrl,
            verifyUrl,
          })
        }
      } catch (err) {
        console.error(`[Ticketing] Email failed for ticket ${ticket.id}:`, err)
      }
    }),
  )

  return { booking, tickets }
}

export async function storePendingBooking(pidx: string, data: {
  eventId: string
  participantId: string
  attendees: AttendeeInput[]
  amounts: AmountsInput
}) {
  await redisConfig.set(`booking:${pidx}`, JSON.stringify(data), { ex: 1800 })
}

export async function getPendingBooking(pidx: string) {
  const raw = await redisConfig.get(`booking:${pidx}`)
  if (!raw) return null

  await redisConfig.del(`booking:${pidx}`)

  if (typeof raw === 'string') {
    return JSON.parse(raw) as {
      eventId: string
      participantId: string
      attendees: AttendeeInput[]
      amounts: AmountsInput
    }
  }

  return raw as {
    eventId: string
    participantId: string
    attendees: AttendeeInput[]
    amounts: AmountsInput
  }
}

export async function enqueueBooking(eventId: string, data: {
  participantId: string
  attendees: AttendeeInput[]
  amounts: AmountsInput
  pidx: string
}) {
  const jobId = crypto.randomUUID()
  const jobData = JSON.stringify({ eventId, ...data })
  await redisConfig.set(`booking:job:${jobId}`, jobData, { ex: 1800 })
  await redisConfig.lpush(`booking:queue:${eventId}`, jobId)
  return jobId
}

async function processBookingJob(jobId: string) {
  const raw = await redisConfig.get(`booking:job:${jobId}`)
  if (!raw) return null

  const data = typeof raw === 'string' ? JSON.parse(raw) : raw
  const { eventId, participantId, attendees, amounts } = data

  try {
    const result = await createBookingPipeline(eventId, participantId, attendees, amounts)
    await redisConfig.set(`booking:result:${jobId}`, JSON.stringify({
      status: 'done',
      bookingId: result.booking.id,
      reference: result.booking.id.slice(0, 8),
    }), { ex: 1800 })
    await redisConfig.del(`booking:job:${jobId}`)
    return { status: 'done', bookingId: result.booking.id }
  } catch (err) {
    console.error('[Ticketing] Queue job failed:', jobId, err)
    await redisConfig.set(`booking:result:${jobId}`, JSON.stringify({
      status: 'error',
      error: err instanceof Error ? err.message : 'Unknown error',
    }), { ex: 1800 })
    await redisConfig.del(`booking:job:${jobId}`)
    return { status: 'error', error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function processBookingQueue(eventId: string) {
  const lockKey = `booking:lock:${eventId}`
  const acquired = await redisConfig.setnx(lockKey, '1')
  if (!acquired) return false

  await redisConfig.expire(lockKey, 120)

  try {
    while (true) {
      const jobId = await redisConfig.rpop(`booking:queue:${eventId}`)
      if (!jobId) break
      await processBookingJob(jobId as string)
    }
    return true
  } finally {
    await redisConfig.del(lockKey)
  }
}

export async function getBookingResult(jobId: string) {
  const raw = await redisConfig.get(`booking:result:${jobId}`)
  if (!raw) return null
  if (typeof raw === 'string') return JSON.parse(raw)
  return raw as { status: string; bookingId?: string; reference?: string; error?: string }
}

export async function getBookingJob(jobId: string) {
  const raw = await redisConfig.get(`booking:job:${jobId}`)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}
