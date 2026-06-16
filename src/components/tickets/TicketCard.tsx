'use client'

import { forwardRef } from 'react'

type TicketCardProps = {
  eventName: string
  attendeeName: string
  attendeeEmail: string
  ticketId: string
  qrCodeDataUrl: string
}

export const TicketCard = forwardRef<HTMLDivElement, TicketCardProps>(function TicketCard(
  { eventName, attendeeName, attendeeEmail, ticketId, qrCodeDataUrl },
  ref,
) {
  return (
    <div
      ref={ref}
      style={{
        width: 360,
        background: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}
    >
      {/* Header band */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
          padding: '20px 24px 16px',
          color: '#ffffff',
        }}
      >
        <p style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.6, margin: 0 }}>
          Event Ticket
        </p>
        <p style={{ fontSize: 20, fontWeight: 700, margin: '4px 0 0', lineHeight: 1.2 }}>
          {eventName}
        </p>
      </div>

      {/* Dashed tear line */}
      <div
        style={{
          borderTop: '2px dashed #e2e8f0',
          margin: '0 16px',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: -28,
            top: -10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#f8fafc',
            border: '2px solid #e2e8f0',
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: -28,
            top: -10,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#f8fafc',
            border: '2px solid #e2e8f0',
          }}
        />
      </div>

      {/* Body */}
      <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Attendee info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', margin: 0 }}>
              Attendee
            </p>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: '2px 0 0' }}>
              {attendeeName}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', margin: 0 }}>
              Email
            </p>
            <p style={{ fontSize: 13, color: '#475569', margin: '2px 0 0' }}>{attendeeEmail}</p>
          </div>
        </div>

        {/* QR code centered */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <img
            src={qrCodeDataUrl}
            alt="QR Code"
            style={{ width: 180, height: 180, display: 'block' }}
          />
          <p style={{ fontSize: 10, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', margin: 0 }}>
            Scan to verify
          </p>
        </div>

        {/* Ticket ID footer */}
        <div
          style={{
            borderTop: '1px solid #f1f5f9',
            paddingTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
            Ticket ID
          </p>
          <p style={{ fontSize: 10, fontFamily: 'monospace', color: '#64748b', margin: 0 }}>
            {ticketId.slice(0, 16).toUpperCase()}
          </p>
        </div>
      </div>
    </div>
  )
})
