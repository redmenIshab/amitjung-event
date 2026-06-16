'use client'

import dynamic from 'next/dynamic'

// ssr: false is only allowed inside a Client Component
const ScannerClient = dynamic(
  () => import('@/components/scanner/ScannerClient').then((m) => m.ScannerClient),
  { ssr: false, loading: () => <p className="text-gray-400 text-sm">Loading scanner…</p> },
)

export function ScannerLoader() {
  return <ScannerClient />
}
