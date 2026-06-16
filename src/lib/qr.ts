import QRCode from 'qrcode'

export function buildVerifyUrl(token: string): string {
  // Priority: explicit app URL → Vercel deployment URL → localhost dev
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return `${base}/ticket/${token}`
}

export async function generateQRCodeDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })
}
