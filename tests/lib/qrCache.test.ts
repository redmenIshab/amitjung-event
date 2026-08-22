import { describe, it, expect, vi, beforeEach } from 'vitest'

const toDataURL = vi.hoisted(() => vi.fn())
vi.mock('qrcode', () => ({ default: { toDataURL } }))

import { generateQRCodeDataURL, __resetQrCache, QR_CACHE_MAX } from '@/lib/qr'

beforeEach(() => {
  toDataURL.mockReset().mockImplementation(async (t: string) => `data:image/png;base64,${t}`)
  __resetQrCache()
})

describe('generateQRCodeDataURL', () => {
  it('returns the encoded QR', async () => {
    expect(await generateQRCodeDataURL('https://x/ticket/a')).toBe(
      'data:image/png;base64,https://x/ticket/a',
    )
  })

  it('encodes a repeated URL only once', async () => {
    // A ticket's QR is deterministic from its token, so regenerating it on
    // every request is pure repeated work — measured at ~8ms each.
    await generateQRCodeDataURL('https://x/ticket/a')
    await generateQRCodeDataURL('https://x/ticket/a')
    await generateQRCodeDataURL('https://x/ticket/a')
    expect(toDataURL).toHaveBeenCalledOnce()
  })

  it('still distinguishes different tickets', async () => {
    const a = await generateQRCodeDataURL('https://x/ticket/a')
    const b = await generateQRCodeDataURL('https://x/ticket/b')
    expect(a).not.toBe(b)
    expect(toDataURL).toHaveBeenCalledTimes(2)
  })

  it('stays bounded so a long-lived instance cannot grow without limit', async () => {
    for (let i = 0; i < QR_CACHE_MAX + 50; i++) {
      await generateQRCodeDataURL(`https://x/ticket/${i}`)
    }
    toDataURL.mockClear()
    // The oldest entries were evicted, so the very first URL must be re-encoded.
    await generateQRCodeDataURL('https://x/ticket/0')
    expect(toDataURL).toHaveBeenCalledOnce()
  })

  it('does not cache a failed encode', async () => {
    toDataURL.mockRejectedValueOnce(new Error('boom'))
    await expect(generateQRCodeDataURL('https://x/ticket/z')).rejects.toThrow('boom')
    toDataURL.mockResolvedValueOnce('data:image/png;base64,ok')
    expect(await generateQRCodeDataURL('https://x/ticket/z')).toBe('data:image/png;base64,ok')
  })
})
