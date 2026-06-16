import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { bulkGenerateTicketSchema } from '@/lib/validations'
import { generateQRCodeDataURL, buildVerifyUrl } from '@/lib/qr'
import { sendTicketEmail, isEmailEnabled } from '@/lib/email'

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
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { eventId } = await params
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

  const body = await request.json()
  const parsed = bulkGenerateTicketSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // Create all tickets in a single transaction
  const createdTickets = await prisma.$transaction(
    parsed.data.tickets.map((t) =>
      prisma.ticket.create({
        data: {
          eventId,
          attendeeName: t.attendeeName,
          attendeeEmail: t.attendeeEmail,
          source: 'ADMIN',
        },
      }),
    ),
  )

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
            eventDate: event.date,
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
