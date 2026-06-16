import { describe, it, expect, afterEach } from 'vitest'
import { generateQRCodeDataURL, buildVerifyUrl } from '@/lib/qr'

describe('buildVerifyUrl', () => {
  const original = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = original
  })

  it('builds verify URL using NEXT_PUBLIC_APP_URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://tickets.example.com'
    expect(buildVerifyUrl('abc123')).toBe('https://tickets.example.com/verify/abc123')
  })

  it('falls back to localhost when env var is not set', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(buildVerifyUrl('abc123')).toBe('http://localhost:3000/verify/abc123')
  })
})

describe('generateQRCodeDataURL', () => {
  it('returns a PNG base64 data URL', async () => {
    const url = await generateQRCodeDataURL('https://example.com/verify/abc123')
    expect(url).toMatch(/^data:image\/png;base64,/)
    expect(url.length).toBeGreaterThan(100)
  })

  it('generates different data URLs for different inputs', async () => {
    const url1 = await generateQRCodeDataURL('https://example.com/verify/token-1')
    const url2 = await generateQRCodeDataURL('https://example.com/verify/token-2')
    expect(url1).not.toBe(url2)
  })
})
