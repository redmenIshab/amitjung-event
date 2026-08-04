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

// ── Staff account credentials ─────────────────────────────────────────────────

/**
 * Escapes HTML-significant characters. Matters most for the password: an
 * unescaped `&` or `<` would render as something else and the recipient would
 * copy a password that does not work.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface SendStaffCredentialsParams {
  to: string
  name: string
  role: string
  password: string
  loginUrl: string
}

/**
 * Sends an admin-created staff member their sign-in credentials.
 *
 * This mails a plaintext password by design — the alternative (a one-time
 * invite link) was weighed and not chosen. Callers must treat delivery as
 * best-effort and surface the password to the admin when this throws, so an
 * account is never created with its password unrecoverable.
 */
export async function sendStaffCredentialsEmail(
  params: SendStaffCredentialsParams,
): Promise<void> {
  const { to, name, role, password, loginUrl } = params

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'tickets@yourdomain.com',
    to,
    subject: 'Your Lyante Control Center account',
    html: `<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff;">
  <h1 style="color:#111;font-size:22px;margin-bottom:4px;">Control Center Access</h1>
  <p style="color:#555;margin-top:0;">Hi ${escapeHtml(name)},</p>
  <p>An account has been created for you on the Lyante Control Center with the
     <strong>${escapeHtml(role)}</strong> role.</p>
  <table style="border-collapse:collapse;width:100%;margin:20px 0;font-size:14px;">
    <tr>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Email</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;">${escapeHtml(to)}</td>
    </tr>
    <tr>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;background:#f9fafb;">Password</td>
      <td style="padding:10px 12px;border:1px solid #e5e7eb;font-family:monospace;">${escapeHtml(password)}</td>
    </tr>
  </table>
  <div style="text-align:center;margin:24px 0;">
    <a href="${escapeHtml(loginUrl)}"
       style="display:inline-block;background:#c8922a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:600;">
      Sign in
    </a>
  </div>
  <p style="color:#9ca3af;font-size:12px;">
    Keep these details private. If you did not expect this email, contact your administrator.
  </p>
</body>
</html>`,
  })

  if (error)
    throw new Error(`Failed to send credentials email: ${(error as { message: string }).message}`)
}
