import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

/** Returns true only when ENABLE_EMAIL=true in the environment. */
export function isEmailEnabled(): boolean {
  return process.env.ENABLE_EMAIL === 'true'
}

export interface SendTicketEmailParams {
  to: string
  attendeeName: string
  eventName: string
  eventDate: Date
  eventVenue: string
  qrCodeDataUrl: string
  verifyUrl: string
}

export async function sendTicketEmail(params: SendTicketEmailParams): Promise<void> {
  const { to, attendeeName, eventName, eventDate, eventVenue, qrCodeDataUrl } = params

  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  })

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'tickets@yourdomain.com',
    to,
    subject: `Your ticket for ${eventName}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
  <h1 style="color:#111;font-size:24px;margin-bottom:4px;">Your Ticket</h1>
  <p style="color:#555;margin-top:0;">Hi ${attendeeName},</p>
  <p>Here is your ticket for <strong>${eventName}</strong>. Show the QR code at the entrance.</p>
  <table style="border-collapse:collapse;width:100%;margin:20px 0;font-size:14px;">
    <tr>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Event</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;">${eventName}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Date</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;">${formattedDate}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Venue</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;">${eventVenue}</td>
    </tr>
  </table>
  <div style="text-align:center;margin:24px 0;">
    <img src="${qrCodeDataUrl}" alt="Entry QR Code" style="width:240px;height:240px;" />
  </div>
  <p style="color:#9ca3af;font-size:12px;">
    This ticket is unique to you. Do not share it — it can only be used once.
  </p>
</body>
</html>`,
  })

  if (error) throw new Error(`Failed to send ticket email: ${(error as { message: string }).message}`)
}

// ── Digital ticket PDF ────────────────────────────────────────────────────────

export interface SendTicketPDFParams {
  to: string
  attendeeName: string
  eventName: string
  pdfBase64: string        // raw base64, no data-URI prefix
}

export async function sendTicketPDF(params: SendTicketPDFParams): Promise<void> {
  const { to, attendeeName, eventName, pdfBase64 } = params

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'tickets@yourdomain.com',
    to,
    subject: `Your Digital Ticket — ${eventName}`,
    html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
  <h1 style="color:#111;font-size:22px;margin-bottom:4px;">Your Digital Ticket</h1>
  <p style="color:#555;margin-top:0;">Hi ${attendeeName},</p>
  <p>Your digital ticket for <strong>${eventName}</strong> is attached to this email as a PDF.</p>
  <p>Print it or show it on your phone at the entrance — staff will scan the QR code to check you in.</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
  <p style="color:#9ca3af;font-size:12px;">
    This ticket is unique and single-use. Do not share it with others.
  </p>
</body>
</html>`,
    attachments: [
      {
        filename: `ticket-${eventName.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        content: Buffer.from(pdfBase64, 'base64'),
      },
    ],
  })

  if (error) throw new Error(`Failed to send PDF email: ${(error as { message: string }).message}`)
}
