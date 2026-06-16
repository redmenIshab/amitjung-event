import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendTicketPDF, isEmailEnabled } from '@/lib/email'
import { z } from 'zod'

type Params = { params: Promise<{ eventId: string; ticketId: string }> }

const bodySchema = z.object({
  pdfBase64: z.string().min(100),
})

export async function POST(request: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { eventId, ticketId } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId, eventId },
    include: { event: { select: { name: true } } },
  })

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  if (!isEmailEnabled()) {
    return NextResponse.json({ error: 'Email sending is currently disabled' }, { status: 503 })
  }
  if (!ticket.attendeeEmail) {
    return NextResponse.json({ error: 'Ticket has no attendee email' }, { status: 422 })
  }

  const body = await request.json()
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid PDF data' }, { status: 422 })
  }

  await sendTicketPDF({
    to: ticket.attendeeEmail,
    attendeeName: ticket.attendeeName ?? ticket.attendeeEmail,
    eventName: ticket.event.name,
    pdfBase64: parsed.data.pdfBase64,
  })

  return NextResponse.json({ ok: true })
}
