import { describe, it, expect, vi } from 'vitest'

const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'msg_123', error: null }))

vi.mock('resend', () => ({
  Resend: vi.fn(function () {
    return { emails: { send: mockSend } }
  }),
}))

import { sendTicketEmail } from '@/lib/email'

describe('sendTicketEmail', () => {
  it('calls Resend with the correct recipient and subject', async () => {
    await sendTicketEmail({
      to: 'jane@example.com',
      attendeeName: 'Jane Doe',
      eventName: 'Summer Beats',
      eventDate: new Date('2026-08-15T20:00:00Z'),
      eventVenue: 'Central Park',
      qrCodeDataUrl: 'data:image/png;base64,abc',
      verifyUrl: 'https://tickets.example.com/verify/token123',
    })

    expect(mockSend).toHaveBeenCalledOnce()
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'jane@example.com',
        subject: 'Your ticket for Summer Beats',
      })
    )
  })

  it('includes the QR code and event details in the HTML body', async () => {
    await sendTicketEmail({
      to: 'jane@example.com',
      attendeeName: 'Jane Doe',
      eventName: 'Summer Beats',
      eventDate: new Date('2026-08-15T20:00:00Z'),
      eventVenue: 'Central Park',
      qrCodeDataUrl: 'data:image/png;base64,abc',
      verifyUrl: 'https://tickets.example.com/verify/token123',
    })

    const call = mockSend.mock.calls[0][0]
    expect(call.html).toContain('Jane Doe')
    expect(call.html).toContain('Summer Beats')
    expect(call.html).toContain('Central Park')
    expect(call.html).toContain('data:image/png;base64,abc')
  })
})
