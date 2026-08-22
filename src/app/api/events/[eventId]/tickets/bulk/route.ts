import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { bulkGenerateTicketSchema } from '@/lib/validations'
import { generateQRCodeDataURL, buildVerifyUrl } from '@/lib/qr'
import { sendTicketEmail, isEmailEnabled } from '@/lib/email'
import { ensureSystemBooking } from '@/lib/ticketing'
import { actorFromSession, recordTicketActivity } from '@/lib/ticketActivity'

type Params = { params: Promise<{ eventId: string }> }

export type BulkTicketResult = {
  attendeeName: string | null
  attendeeEmail: string | null
  category: 'GENERAL' | 'VIP'
  ticketId: string
  token: string
  qrCodeDataUrl: string
  emailSent: boolean
  error?: string
}

export async function POST(request: Request, { params }: Params) {
  const gate = await requireApiCapability('TICKET_MANAGE')
  if (gate instanceof NextResponse) return gate

  const { eventId } = await params
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await request.json()
  const parsed = bulkGenerateTicketSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // Create all tickets in a single transaction
  const bookingId = await ensureSystemBooking(eventId)

  // Explicit timeout: this is an INTERACTIVE transaction (the log entry must
  // share it), and Prisma defaults those to 5s. The previous batch form had no
  // such limit, and a full run is up to 200 inserts over a pooled connection —
  // the default would abort runs that used to succeed.
  const createdTickets = await prisma.$transaction(async (tx) => {
    const created = await Promise.all(
      parsed.data.tickets.map((t) =>
        tx.ticket.create({
          data: {
            eventId,
            bookingId,
            attendeeName: t.attendeeName,
            attendeeEmail: t.attendeeEmail,
            source: 'ADMIN',
          },
        }),
      ),
    )
    // One aggregate row rather than N: a bulk run is one admin action, and N
    // rows per run would bury the per-ticket state changes that matter.
    await recordTicketActivity(tx, {
      eventId,
      action: 'ISSUED',
      quantity: created.length,
      actor: actorFromSession(gate.session),
      meta: { bulk: true },
    })
    return created
  }, { maxWait: 10_000, timeout: 60_000 })

  // Generate QR codes and send emails — collect per-ticket results
  const results: BulkTicketResult[] = await Promise.all(
    createdTickets.map(async (ticket) => {
      const verifyUrl = buildVerifyUrl(ticket.token)
      const qrCodeDataUrl = await generateQRCodeDataURL(verifyUrl)

      let emailSent = false
      let error: string | undefined

      if (isEmailEnabled()) {
        try {
          await sendTicketEmail({
            to: ticket.attendeeEmail ?? '',
            attendeeName: ticket.attendeeName ?? '',
            eventName: event.name,
            eventDate: event.bookingDeadline,
            eventVenue: event.venue,
            qrCodeDataUrl,
            verifyUrl,
          })
          emailSent = true
        } catch (err) {
          error = err instanceof Error ? err.message : 'Email failed'
        }
      }

      return {
        attendeeName: ticket.attendeeName,
        attendeeEmail: ticket.attendeeEmail,
        category: ticket.category,
        ticketId: ticket.id,
        token: ticket.token,
        qrCodeDataUrl,
        emailSent,
        error,
      }
    }),
  )

  return NextResponse.json({ results }, { status: 201 })
}
