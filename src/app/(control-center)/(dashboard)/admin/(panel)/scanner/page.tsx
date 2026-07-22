import { requirePageCapability } from '@/lib/rbac'
import { ScannerLoader } from '@/components/scanner/ScannerLoader'

export default async function ScannerPage() {
  await requirePageCapability('TICKET_SCAN')

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Scanner</h1>
        <p className="text-gray-500 text-sm mt-1">
          Scan a ticket QR code to check in the attendee. Only valid unused tickets will be
          accepted.
        </p>
      </div>
      <ScannerLoader />
    </div>
  )
}
