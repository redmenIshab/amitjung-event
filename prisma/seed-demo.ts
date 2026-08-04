/**
 * Demo analytics dataset — NOT part of `db:seed`.
 *
 * Run explicitly:  npm run db:seed:demo
 * Remove:          npm run db:seed:demo -- --purge
 *
 * Generates events spanning past and upcoming, with payments, tickets and
 * check-ins, so the analytics dashboards can be developed and reviewed against
 * realistic shapes instead of an empty database.
 *
 * Everything it creates is tagged with DEMO_TAG in the event name and a
 * recognisable participant email domain, so --purge removes exactly these rows
 * and never touches real data.
 */
import { PrismaClient, Prisma, type EventStatus, type EventType } from '@prisma/client'

const prisma = new PrismaClient()

const DEMO_TAG = '[demo]'
const DEMO_EMAIL_DOMAIN = 'demo-seed.invalid'

const DAY = 24 * 60 * 60 * 1000
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY)

/** Deterministic PRNG so repeated runs produce comparable dashboards. */
function makeRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}
const rand = makeRandom(20260804)
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]
const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))

interface Blueprint {
  name: string
  venue: string
  dayOffset: number
  status: EventStatus
  eventType: EventType
  capacity: number
  offered: number
  price: number
  /** null exercises the "commission rate not set" path in analytics. */
  commission: number | null
  /** Share of offered inventory sold, 0–1. */
  sellThrough: number
  /** Share of sold tickets scanned (past events only). */
  checkedInShare: number
  /** Share of sold tickets that were comped by an admin. */
  compedShare: number
  /** Share of paid sales later refunded. */
  refundShare: number
}

const BLUEPRINTS: Blueprint[] = [
  {
    name: 'Kathmandu Winter Sessions',
    venue: 'Patan Durbar Square',
    dayOffset: -96, status: 'COMPLETED', eventType: 'CONCERT',
    capacity: 800, offered: 700, price: 1500, commission: 12,
    sellThrough: 0.94, checkedInShare: 0.88, compedShare: 0.04, refundShare: 0.02,
  },
  {
    name: 'Himalayan Folk Revival',
    venue: 'Pokhara Lakeside Grounds',
    dayOffset: -71, status: 'COMPLETED', eventType: 'FESTIVAL',
    capacity: 2000, offered: 1800, price: 2200, commission: 10,
    sellThrough: 0.71, checkedInShare: 0.81, compedShare: 0.06, refundShare: 0.05,
  },
  {
    name: 'Gorkhey Unplugged',
    venue: 'Jazz Upstairs, Lazimpat',
    dayOffset: -54, status: 'COMPLETED', eventType: 'CONCERT',
    capacity: 180, offered: 160, price: 900, commission: 18,
    sellThrough: 1.0, checkedInShare: 0.93, compedShare: 0.08, refundShare: 0.0,
  },
  {
    name: 'Thamel Street Beats',
    venue: 'Thamel Open Air',
    dayOffset: -38, status: 'COMPLETED', eventType: 'FESTIVAL',
    capacity: 1200, offered: 1000, price: 1200,
    // Deliberately unset: exercises the "—" commission path end to end.
    commission: null,
    sellThrough: 0.44, checkedInShare: 0.62, compedShare: 0.12, refundShare: 0.09,
  },
  {
    name: 'Producers Roundtable',
    venue: 'Hotel Yak & Yeti',
    dayOffset: -17, status: 'COMPLETED', eventType: 'CONFERENCE',
    capacity: 300, offered: 260, price: 3500, commission: 15,
    sellThrough: 0.83, checkedInShare: 0.76, compedShare: 0.15, refundShare: 0.03,
  },
  {
    name: 'Monsoon Amphitheatre Night',
    venue: 'Bhaktapur Amphitheatre',
    dayOffset: 12, status: 'PUBLISHED', eventType: 'CONCERT',
    capacity: 1500, offered: 1300, price: 1800, commission: 12,
    sellThrough: 0.58, checkedInShare: 0, compedShare: 0.03, refundShare: 0.02,
  },
  {
    name: 'Everest Base Camp Benefit',
    venue: 'Tundikhel Grounds',
    dayOffset: 33, status: 'PUBLISHED', eventType: 'OTHER',
    capacity: 2500, offered: 2200, price: 2500, commission: 8,
    sellThrough: 0.26, checkedInShare: 0, compedShare: 0.02, refundShare: 0.0,
  },
  {
    name: 'Newari Jazz Collective',
    venue: 'Kirtipur Community Hall',
    dayOffset: 58, status: 'DRAFT', eventType: 'CONCERT',
    capacity: 400, offered: 350, price: 1400, commission: 14,
    sellThrough: 0, checkedInShare: 0, compedShare: 0, refundShare: 0,
  },
  {
    name: 'Cancelled Riverside Rave',
    venue: 'Bagmati Riverside',
    dayOffset: 20, status: 'CANCELLED', eventType: 'FESTIVAL',
    capacity: 900, offered: 800, price: 1600, commission: 10,
    sellThrough: 0.18, checkedInShare: 0, compedShare: 0, refundShare: 0.85,
  },
]

async function purge() {
  const events = await prisma.event.findMany({
    where: { name: { contains: DEMO_TAG } },
    select: { id: true },
  })
  const eventIds = events.map((e) => e.id)

  if (eventIds.length > 0) {
    // Children first — Ticket/Booking/Payment have required FKs to Event.
    await prisma.checkIn.deleteMany({ where: { ticket: { eventId: { in: eventIds } } } })
    await prisma.ticket.deleteMany({ where: { eventId: { in: eventIds } } })
    await prisma.booking.deleteMany({ where: { eventId: { in: eventIds } } })
    await prisma.payment.deleteMany({ where: { eventId: { in: eventIds } } })
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } })
  }
  const { count } = await prisma.participant.deleteMany({
    where: { email: { endsWith: `@${DEMO_EMAIL_DOMAIN}` } },
  })

  console.log(`Purged ${eventIds.length} demo events and ${count} demo participants.`)
}

/**
 * Rows are accumulated in memory and inserted with `createMany` per table in
 * FK order. Creating them one-by-one meant a network round-trip per ticket —
 * several thousand of them against a pooled Neon connection, which took long
 * enough to be unusable.
 */
interface Batches {
  payments: Prisma.PaymentCreateManyInput[]
  bookings: Prisma.BookingCreateManyInput[]
  tickets: Prisma.TicketCreateManyInput[]
  checkIns: Prisma.CheckInCreateManyInput[]
}

let idCounter = 0
/** Explicit ids so children can reference parents before insertion. */
const demoId = (kind: string) => `demo_${kind}_${(idCounter += 1).toString(36)}`

async function seed() {
  await purge() // idempotent: re-running replaces rather than duplicates

  // A pool of buyers so participant counts and repeat purchases look real.
  const buyerRows = Array.from({ length: 60 }, (_, i) => ({
    id: demoId('participant'),
    name: `Demo Buyer ${i + 1}`,
    email: `buyer${i + 1}@${DEMO_EMAIL_DOMAIN}`,
    googleId: `demo-google-${i + 1}-${Date.now()}`,
    createdAt: daysFromNow(-between(1, 120)),
  }))
  await prisma.participant.createMany({ data: buyerRows })
  const buyers = buyerRows.map((b) => ({ id: b.id }))

  const batch: Batches = { payments: [], bookings: [], tickets: [], checkIns: [] }

  for (const bp of BLUEPRINTS) {
    const eventDate = daysFromNow(bp.dayOffset)
    const event = await prisma.event.create({
      data: {
        name: `${bp.name} ${DEMO_TAG}`,
        venue: bp.venue,
        description: 'Generated demo event for analytics development.',
        bookingDeadline: eventDate,
        capacity: bp.capacity,
        ticketsAvailable: bp.offered,
        baseTicketPrice: bp.price,
        commissionPercentage: bp.commission,
        hasDiscount: false,
        discountPercentage: 0,
        discountUpto: eventDate,
        isOpen: bp.status === 'PUBLISHED',
        status: bp.status,
        eventType: bp.eventType,
        genres: ['LIVE'],
        createdAt: daysFromNow(bp.dayOffset - 60),
      },
    })

    const sold = Math.round(bp.offered * bp.sellThrough)
    const comped = Math.round(sold * bp.compedShare)
    const paidCount = sold - comped
    if (sold === 0) {
      console.log(`  ${bp.name}: no sales (${bp.status})`)
      continue
    }

    // Paid tickets arrive as Payment → Booking → Ticket, matching the real
    // pipeline in src/lib/ticketing.ts.
    let ticketsMade = 0
    let refundedSoFar = 0
    const refundTarget = Math.round(paidCount * bp.refundShare)

    while (ticketsMade < paidCount) {
      const qty = Math.min(between(1, 4), paidCount - ticketsMade)
      const buyer = pick(buyers)
      // Sales ramp toward the event date rather than spreading uniformly.
      const soldOn = daysFromNow(bp.dayOffset - Math.round(between(1, 55) * (1 - rand() * 0.5)))
      const gross = qty * bp.price

      const refundThis = refundedSoFar < refundTarget
      if (refundThis) refundedSoFar += qty

      const paymentId = demoId('payment')
      const bookingId = demoId('booking')

      batch.payments.push({
        id: paymentId,
        totalAmount: gross,
        discountAmount: 0,
        discountPercentage: 0,
        finalAmount: gross,
        paymentInitiatorId: buyer.id,
        eventId: event.id,
        paymentStatus: refundThis ? 'REFUND' : 'PAID',
        createdAt: soldOn,
      })
      batch.bookings.push({
        id: bookingId,
        quantity: qty,
        status: refundThis ? 'REFUND' : 'PAID',
        paymentId,
        eventId: event.id,
        participantId: buyer.id,
        createdAt: soldOn,
      })

      for (let i = 0; i < qty; i += 1) {
        const scanned = !refundThis && bp.dayOffset < 0 && rand() < bp.checkedInShare
        const ticketId = demoId('ticket')
        batch.tickets.push({
          id: ticketId,
          token: ticketId,
          eventId: event.id,
          bookingId,
          attendeeName: `Demo Attendee ${ticketsMade + i + 1}`,
          attendeeEmail: `attendee${ticketsMade + i + 1}@${DEMO_EMAIL_DOMAIN}`,
          category: rand() < 0.15 ? 'VIP' : 'GENERAL',
          status: refundThis ? 'CANCELLED' : scanned ? 'USED' : 'UNUSED',
          source: 'SELF_REGISTERED',
          createdAt: soldOn,
        })
        if (scanned) {
          // Doors: a burst in the ~3 hours before start.
          batch.checkIns.push({
            ticketId,
            scannedAt: new Date(eventDate.getTime() - between(5, 190) * 60 * 1000),
          })
        }
      }
      ticketsMade += qty
    }

    // Comped tickets: admin-issued, zero-value — attendance without revenue.
    for (let i = 0; i < comped; i += 1) {
      const scanned = bp.dayOffset < 0 && rand() < bp.checkedInShare
      const issuedOn = daysFromNow(bp.dayOffset - between(2, 30))
      const paymentId = demoId('payment')
      const bookingId = demoId('booking')
      const ticketId = demoId('ticket')

      batch.payments.push({
        id: paymentId,
        totalAmount: 0,
        discountAmount: 0,
        discountPercentage: 100,
        finalAmount: 0,
        paymentInitiatorId: pick(buyers).id,
        eventId: event.id,
        // Comps are not income: PENDING keeps them out of every money figure,
        // which excludes PENDING and REJECTED by design.
        paymentStatus: 'PENDING',
        createdAt: issuedOn,
      })
      batch.bookings.push({
        id: bookingId,
        quantity: 1,
        status: 'PAID',
        paymentId,
        eventId: event.id,
        participantId: pick(buyers).id,
        createdAt: issuedOn,
      })
      batch.tickets.push({
        id: ticketId,
        token: ticketId,
        eventId: event.id,
        bookingId,
        attendeeName: `Comped Guest ${i + 1}`,
        distributorName: 'Guest list',
        category: 'GENERAL',
        status: scanned ? 'USED' : 'UNUSED',
        source: 'ADMIN',
        createdAt: issuedOn,
      })
      if (scanned) {
        batch.checkIns.push({
          ticketId,
          scannedAt: new Date(eventDate.getTime() - between(5, 190) * 60 * 1000),
        })
      }
    }

    console.log(
      `  ${bp.name}: ${paidCount} paid + ${comped} comped of ${bp.offered} offered` +
        `${bp.commission === null ? ' (no commission rate)' : ` @ ${bp.commission}%`}`,
    )
  }

  // Insert in FK order. Chunked because a single createMany with thousands of
  // rows exceeds the driver's parameter limit.
  const CHUNK = 500
  async function insertAll<T>(
    label: string,
    rows: T[],
    write: (chunk: T[]) => Promise<unknown>,
  ) {
    for (let i = 0; i < rows.length; i += CHUNK) {
      await write(rows.slice(i, i + CHUNK))
    }
    console.log(`  inserted ${rows.length} ${label}`)
  }

  console.log('')
  await insertAll('payments', batch.payments, (data) =>
    prisma.payment.createMany({ data }),
  )
  await insertAll('bookings', batch.bookings, (data) =>
    prisma.booking.createMany({ data }),
  )
  await insertAll('tickets', batch.tickets, (data) =>
    prisma.ticket.createMany({ data }),
  )
  await insertAll('check-ins', batch.checkIns, (data) =>
    prisma.checkIn.createMany({ data }),
  )

  console.log(`\nSeeded ${BLUEPRINTS.length} demo events and ${buyers.length} demo buyers.`)
  console.log('Remove them with: npm run db:seed:demo -- --purge')
}

const main = process.argv.includes('--purge') ? purge : seed

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
