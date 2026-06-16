'use client'

import { forwardRef } from 'react'

export type DigitalTicketProps = {
  attendeeName: string | null
  category: 'GENERAL' | 'VIP'
  ticketId: string
  qrCodeDataUrl: string
}

const GOLD        = '#c9a84c'
const GOLD_MUTED  = 'rgba(201,168,76,0.35)'
const CREAM       = '#f0dfc0'
const BG_DARK     = '#1e0409'

/** Fixed 900×382 px matches the ticket background's native aspect ratio (3168:1344). */
export const DigitalTicket = forwardRef<HTMLDivElement, DigitalTicketProps>(
  function DigitalTicket({ attendeeName, category, ticketId, qrCodeDataUrl }, ref) {
    const isVip = category === 'VIP'

    return (
      <div
        ref={ref}
        style={{
          width: '900px',
          height: '382px',     // 900 × (1344/3168) ≈ 382 px — exact native ratio
          position: 'relative',
          borderRadius: '10px',
          overflow: 'hidden',
          fontFamily: 'Georgia, "Times New Roman", serif',
          boxSizing: 'border-box',
        }}
      >
        {/* ── Full-cover ticket background — gold for VIP, dark for GENERAL ── */}
        <img
          src={isVip ? '/ticket-background-vip.jpg' : '/ticket-background.png'}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
          }}
        />

        {/* ── QR overlay — bottom-left, matching the placeholder in the design ── */}
        <div
          style={{
            position: 'absolute',
            bottom: '22px',
            left: '22px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '5px',
            // VIP gold bg gets a slightly warmer dark overlay to complement the gold theme
            background: isVip ? 'rgba(30,12,0,0.82)' : 'rgba(10,2,4,0.78)',
            backdropFilter: 'blur(3px)',
            borderRadius: '8px',
            padding: '9px 10px 8px',
            border: `1px solid ${GOLD_MUTED}`,
            width: '152px',
          }}
        >
          {/* QR code */}
          <div style={{
            background: '#fff',
            padding: '4px',
            borderRadius: '5px',
            border: `1px solid ${GOLD}`,
            lineHeight: 0,
          }}>
            <img
              src={qrCodeDataUrl}
              alt="Entry QR"
              style={{ width: '124px', height: '124px', display: 'block' }}
            />
          </div>

          {/* Scan label */}
          <p style={{
            color: GOLD,
            fontSize: '8.5px',
            letterSpacing: '1.6px',
            textTransform: 'uppercase',
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.4,
          }}>
            Scan for Entry &amp; Info
          </p>

          {/* Divider */}
          <div style={{ width: '100%', height: '1px', background: GOLD_MUTED }} />

          {/* Attendee name */}
          {attendeeName && (
            <p style={{
              color: CREAM,
              fontSize: '10px',
              fontWeight: 'bold',
              margin: 0,
              textAlign: 'center',
              wordBreak: 'break-word',
              lineHeight: 1.3,
            }}>
              {attendeeName}
            </p>
          )}

          {/* Category badge */}
          <div style={{
            background: isVip ? GOLD : 'transparent',
            border: `1px solid ${GOLD}`,
            color: isVip ? BG_DARK : GOLD,
            padding: '2px 10px',
            borderRadius: '20px',
            fontSize: '8.5px',
            fontWeight: 'bold',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}>
            {category}
          </div>

          {/* Ticket ID */}
          <p style={{
            color: 'rgba(201,168,76,0.45)',
            fontSize: '7px',
            fontFamily: 'monospace',
            margin: 0,
            letterSpacing: '0.5px',
          }}>
            {ticketId.slice(0, 16).toUpperCase()}
          </p>
        </div>
      </div>
    )
  },
)
