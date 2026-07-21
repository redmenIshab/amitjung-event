import { NextResponse } from 'next/server'
import { requireApiCapability } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'
import { sendTicketPDF, isEmailEnabled } from '@/lib/email'
import { z } from 'zod'

type Params = { params: Promise<{ eventId: string; ticketId: string }> }

const bodySchema = z.object({
  pdfBase64: z.string().min(100),
})

export async function POST(request: Request, { params }: Params) {
  const gate = await requireApiCapability('TICKET_MANAGE')
  if (gate instanceof NextResponse) return gate

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
