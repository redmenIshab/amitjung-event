import { requirePageCapability } from '@/lib/rbac'
import { visibleEventIds } from '@/lib/eventAccess'
import { prisma } from '@/lib/prisma'
import { ScannerLoader } from '@/components/scanner/ScannerLoader'

export default async function ScannerPage() {
  const session = await requirePageCapability('TICKET_SCAN')
  // null for ADMIN/STAFF — they scan anything, so no notice is shown.
  const scope = await visibleEventIds(session)
  const scopedEvents = scope
    ? await prisma.event.findMany({
        where: { id: { in: scope } },
        select: { name: true },
        orderBy: { bookingDeadline: 'asc' },
      })
    : null

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scanner</h1>
        <p className="text-gray-500 text-sm mt-1">
          Scan a ticket QR code to check in the attendee. Only valid unused tickets will be
          accepted.
        </p>
        {scopedEvents && (
          <p className="text-sm text-gray-700 mt-2 rounded-md border border-black/10 bg-gray-50 px-3 py-2">
            {scopedEvents.length === 0
              ? 'You are not assigned to any event yet, so no ticket will be accepted.'
              : `Scanning for ${scopedEvents.map((e) => e.name).join(', ')}. Tickets for other events will be rejected.`}
          </p>
        )}
      </div>
      <ScannerLoader />
    </div>
  )
}
