'use client'

export function QRDisplay({ dataUrl, token }: { dataUrl: string; token: string }) {
  return (
    <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-white max-w-xs">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="Ticket QR Code" className="w-48 h-48" />
      <p className="text-xs text-gray-400 font-mono break-all">{token}</p>
    </div>
  )
}
