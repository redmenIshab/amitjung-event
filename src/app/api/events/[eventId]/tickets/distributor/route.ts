import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { distributorTicketSchema } from '@/lib/validations'
import { generateQRCodeDataURL, buildVerifyUrl } from '@/lib/qr'
import { ensureSystemBooking } from '@/lib/ticketing'

type Params = { params: Promise<{ eventId: string }> }

export type DistributorTicketResult = {
  ticketNumber: number
  ticketId: string
  token: string
  qrCodeDataUrl: string
  category: 'GENERAL' | 'VIP'
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
  const parsed = distributorTicketSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { distributorName, quantity, category } = parsed.data

  const bookingId = await ensureSystemBooking(eventId)

  // Create all tickets in one transaction
  const tickets = await prisma.$transaction(
    Array.from({ length: quantity }, () =>
      prisma.ticket.create({
        data: { eventId, bookingId, distributorName, category, source: 'ADMIN' },
      }),
    ),
  )

  // Generate QR codes in parallel
  const results: DistributorTicketResult[] = await Promise.all(
    tickets.map(async (ticket, idx) => {
      const verifyUrl = buildVerifyUrl(ticket.token)
      const qrCodeDataUrl = await generateQRCodeDataURL(verifyUrl)
      return {
        ticketNumber: idx + 1,
        ticketId: ticket.id,
        token: ticket.token,
        qrCodeDataUrl,
        category: ticket.category,
      }
    }),
  )

  return NextResponse.json({ results }, { status: 201 })
}
