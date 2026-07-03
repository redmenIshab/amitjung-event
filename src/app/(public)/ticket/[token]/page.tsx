import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { lookupTicket } from '@/lib/verify'
import { CheckCircle, XCircle, AlertTriangle, Clock, MapPin, Calendar } from 'lucide-react'

type Props = { params: Promise<{ token: string }> }

export default async function PublicTicketPage({ params }: Props) {
  const { token } = await params
  const session   = await getServerSession(authOptions)
  const result    = await lookupTicket(token)

  // ── Unauthenticated: attendee scanned their own QR ──────────────
  // Show a celebratory page. Do NOT reveal check-in status.
  if (!session) {
    if (!result.found) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6"
          style={{ background: 'linear-gradient(135deg,#0f0208,#2a0612)' }}>
          <div className="text-center max-w-sm w-full rounded-2xl p-8 space-y-3"
            style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(201,168,76,0.3)' }}>
            <div className="text-5xl">❌</div>
            <h1 className="text-xl font-bold text-white">Invalid Ticket</h1>
            <p className="text-sm" style={{ color:'#c4a882' }}>
              This QR code is not recognised. Please contact the event organiser.
            </p>
          </div>
        </div>
      )
    }

    const { ticket } = result
    const isVip     = ticket.category === 'VIP'
    const eventDate = new Date(ticket.event.date).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
    const eventTime = new Date(ticket.event.date).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    })

    const GOLD       = '#c9a84c'
    const GOLD_DIM   = 'rgba(201,168,76,0.65)'
    const GOLD_FAINT = 'rgba(201,168,76,0.18)'
    const CREAM      = '#f0dfc0'
    const MUTED      = '#c4a882'
    const GLASS      = 'rgba(10,3,6,0.72)'
    const GLASS_BDR  = 'rgba(201,168,76,0.22)'

    return (
      /* ── Outer shell ── */
      <div className="min-h-screen flex flex-col md:flex-row"
        style={{ background: '#0d0209' }}>

        {/* ══ LEFT — Event poster (hidden on mobile, sticky on desktop) ══ */}
        <div className="hidden md:block md:w-[42%] lg:w-[38%] sticky top-0 h-screen shrink-0 overflow-hidden">
          {/* Poster image */}
          <img
            src="/event-poster.jpg"
            alt="Event poster"
            className="w-full h-full object-cover object-top"
          />
          {/* Right-side fade so it blends into the content panel */}
          <div className="absolute inset-0"
            style={{ background:'linear-gradient(to right, transparent 60%, #0d0209 100%)' }} />
          {/* Bottom fade */}
          <div className="absolute inset-0"
            style={{ background:'linear-gradient(to top, rgba(13,2,9,0.85) 0%, transparent 40%)' }} />
        </div>

        {/* ══ MOBILE — Poster strip at top ══ */}
        <div className="md:hidden relative h-56 overflow-hidden shrink-0">
          <img
            src="/event-poster.jpg"
            alt="Event poster"
            className="w-full h-full object-cover object-top"
          />
          {/* Bottom gradient so content slides over naturally */}
          <div className="absolute inset-0"
            style={{ background:'linear-gradient(to bottom, transparent 30%, #0d0209 100%)' }} />
        </div>

        {/* ══ RIGHT — Scrollable content ══ */}
        <div className="flex-1 flex flex-col items-center justify-start
                        px-4 pb-10 pt-2 md:pt-10 md:px-8 lg:px-12 overflow-y-auto">
          <div className="w-full max-w-md space-y-4">

            {/* Celebration + headline */}
            <div className="text-center space-y-1 pt-2 md:pt-0">
              <div className="text-5xl md:text-6xl" style={{ animationDuration:'2s' }}>🎉</div>
              <p className="text-xs font-semibold uppercase tracking-widest mt-2"
                style={{ color: GOLD }}>
                {isVip ? '✦ VIP Ticket ✦' : 'General Admission'}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-white">Congratulations!</h1>
              <p className="text-sm md:text-base" style={{ color: CREAM }}>
                You&apos;ve got your ticket for
              </p>
              <p className="text-lg md:text-2xl font-bold" style={{ color: GOLD }}>
                {ticket.event.name}
              </p>
            </div>

            {/* Ticket holder */}
            {ticket.attendeeName && (
              <div className="rounded-2xl px-5 py-3 flex items-center justify-between"
                style={{ background: GLASS, border: `1px solid ${GOLD_FAINT}` }}>
                <p className="text-xs uppercase tracking-widest" style={{ color: GOLD_DIM }}>
                  Ticket holder
                </p>
                <p className="text-sm font-semibold text-white">{ticket.attendeeName}</p>
              </div>
            )}

            {/* Event details */}
            <div className="rounded-2xl p-5 space-y-3"
              style={{ background: GLASS, border: `1px solid ${GLASS_BDR}` }}>
              <div className="flex items-start gap-3">
                <Calendar size={15} style={{ color: GOLD, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p className="text-xs" style={{ color: GOLD_DIM }}>Date &amp; Time</p>
                  <p className="text-sm font-medium text-white">{eventDate}</p>
                  <p className="text-sm" style={{ color: MUTED }}>{eventTime} Onwards</p>
                </div>
              </div>
              <div className="flex items-start gap-3"
                style={{ borderTop: `1px solid ${GOLD_FAINT}`, paddingTop: 12 }}>
                <MapPin size={15} style={{ color: GOLD, marginTop: 2, flexShrink: 0 }} />
                <div>
                  <p className="text-xs" style={{ color: GOLD_DIM }}>Venue</p>
                  <p className="text-sm font-medium text-white">Social Cafe, Sangeet Chowk Itahari</p>
                </div>
              </div>
            </div>

            {/* About the event */}
            {ticket.event.description && (
              <div className="rounded-2xl p-5 space-y-2"
                style={{ background: GLASS, border: `1px solid ${GLASS_BDR}` }}>
                <p className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: GOLD }}>
                  About the Event
                </p>
                <p className="text-sm leading-relaxed" style={{ color: '#d4c4a0' }}>
                  {ticket.event.description}
                </p>
                <div className="pt-2 space-y-1"
                  style={{ borderTop: `1px solid ${GOLD_FAINT}` }}>
                  <p className="text-xs" style={{ color: MUTED }}>
                    <span style={{ color: GOLD_DIM }}>Venue: </span>Social Cafe, Sangeet Chowk Itahari
                  </p>
                  <p className="text-xs" style={{ color: MUTED }}>
                    <span style={{ color: GOLD_DIM }}>Time: </span>5:00 PM Onwards
                  </p>
                </div>
              </div>
            )}

            {/* CTA */}
            <p className="text-xs text-center pb-2" style={{ color: 'rgba(201,168,76,0.5)' }}>
              Present this QR code at the entrance — staff will scan it to check you in.
            </p>

          </div>
        </div>
      </div>
    )
  }

  // ── Authenticated (admin / staff): full ticket details ───────────
  if (!result.found) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center max-w-sm w-full bg-white rounded-2xl shadow-lg p-8">
          <AlertTriangle className="mx-auto text-yellow-500 mb-4" size={64} />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Invalid Ticket</h1>
          <p className="text-gray-500 text-sm">
            This QR code is not recognised. Please contact the event organiser.
          </p>
        </div>
      </div>
    )
  }

  const { ticket, checkedInAt } = result
  const isUsed      = ticket.status === 'USED'
  const isCancelled = ticket.status === 'CANCELLED'

  const eventDate = new Date(ticket.event.date).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-3">

        {/* Status card */}
        <div
          className={`rounded-2xl shadow-lg p-6 text-center ${
            isCancelled
              ? 'bg-red-50 border border-red-200'
              : isUsed
              ? 'bg-orange-50 border border-orange-200'
              : 'bg-green-50 border border-green-200'
          }`}
        >
          {isCancelled ? (
            <>
              <XCircle className="mx-auto text-red-500 mb-3" size={56} />
              <p className="text-xl font-bold text-red-700">Ticket Cancelled</p>
              <p className="text-red-500 text-sm mt-1">This ticket is no longer valid.</p>
            </>
          ) : isUsed ? (
            <>
              <Clock className="mx-auto text-orange-500 mb-3" size={56} />
              <p className="text-xl font-bold text-orange-700">Already Checked In</p>
              {checkedInAt && (
                <p className="text-orange-500 text-sm mt-1">
                  {new Date(checkedInAt).toLocaleString('en-US', {
                    dateStyle: 'medium', timeStyle: 'short',
                  })}
                </p>
              )}
            </>
          ) : (
            <>
              <CheckCircle className="mx-auto text-green-500 mb-3" size={56} />
              <p className="text-xl font-bold text-green-700">Valid Ticket</p>
              <p className="text-green-600 text-sm mt-1">Present this to staff at the entrance.</p>
            </>
          )}
        </div>

        {/* Event & ticket details */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div
            className={`px-6 py-3 text-center text-xs font-bold uppercase tracking-widest ${
              ticket.category === 'VIP' ? 'bg-amber-400 text-amber-900' : 'bg-gray-800 text-white'
            }`}
          >
            {ticket.category} Ticket
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Event</p>
              <p className="text-lg font-bold text-gray-900">{ticket.event.name}</p>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Calendar size={15} className="mt-0.5 shrink-0 text-gray-400" />
              <span>{eventDate}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin size={15} className="mt-0.5 shrink-0 text-gray-400" />
              <span>{ticket.event.venue}</span>
            </div>
            {ticket.event.description && (
              <p className="text-sm text-gray-500 border-t pt-3">{ticket.event.description}</p>
            )}
            {(ticket.attendeeName || ticket.distributorName) && (
              <div className="border-t pt-3 space-y-1">
                {ticket.attendeeName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Attendee</span>
                    <span className="font-medium text-gray-800">{ticket.attendeeName}</span>
                  </div>
                )}
                {ticket.distributorName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Distributor</span>
                    <span className="font-medium text-gray-800">{ticket.distributorName}</span>
                  </div>
                )}
              </div>
            )}
            <div className="border-t pt-3">
              <p className="text-xs text-gray-300 font-mono text-center">
                {ticket.id.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
