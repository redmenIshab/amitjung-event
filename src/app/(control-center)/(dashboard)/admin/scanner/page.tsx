import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { ScannerLoader } from '@/components/scanner/ScannerLoader'

export default async function ScannerPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

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
