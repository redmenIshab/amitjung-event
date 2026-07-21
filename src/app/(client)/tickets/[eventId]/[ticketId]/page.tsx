'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Loader2, Download, Share2, Check } from 'lucide-react'
import { z } from 'zod'
import { ticketDetailResponseSchema } from '@/lib/validations'

const GOLD = '#c8922a'
const GOLD_LIGHT = '#f5c842'
const CREAM = '#f0ede6'
const MUTED = '#9a9590'
const BG = '#080808'
const SURFACE = '#111111'
const SURFACE_MID = '#1c1c1c'

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const eventId = params.eventId as string
  const ticketId = params.ticketId as string

  const [ticket, setTicket] = useState<z.infer<typeof ticketDetailResponseSchema> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }
    if (status !== 'authenticated' || !session || !eventId || !ticketId) return

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    fetch(`${baseUrl}/api/tickets/mine/${eventId}/${ticketId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Ticket not found')
        return r.json()
      })
      .then((raw) => {
        const data = ticketDetailResponseSchema.parse(raw)
        setTicket(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Ticket not found')
        setLoading(false)
      })
  }, [session, status, router, eventId, ticketId])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <Loader2 className="animate-spin" size={32} style={{ color: MUTED }} />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <p style={{ color: '#ef4444' }}>{error || 'Ticket not found'}</p>
      </div>
    )
  }

  const isVip = ticket.category === 'VIP'
  const isUsed = ticket.status === 'USED'
  const isCancelled = ticket.status === 'CANCELLED'

  const eventDate = new Date(ticket.event.bookingDeadline).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const eventTime = new Date(ticket.event.bookingDeadline).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/ticket/${ticket.token}` : ''

  async function handleDownload() {
    if (!ticket) return
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'pt', format: 'a5' })
    doc.setFontSize(18)
    doc.text(ticket.event.name, 40, 60)
    doc.setFontSize(11)
    doc.text(ticket.event.venue, 40, 88)
    doc.text(`${eventDate} · ${eventTime}`, 40, 106)
    if (ticket.attendeeName) doc.text(`Attendee: ${ticket.attendeeName}`, 40, 138)
    doc.text(`Category: ${ticket.category}`, 40, 156)
    doc.text(`Ticket ID: ${ticket.id.toUpperCase()}`, 40, 174)
    doc.addImage(ticket.qrDataUrl, 'PNG', 40, 200, 170, 170)
    doc.setFontSize(9)
    doc.text('Scan this QR code for entry', 40, 388)
    doc.save(`ticket-${ticket.id}.pdf`)
  }

  async function handleShare() {
    if (!ticket) return
    const shareData = {
      title: ticket.event.name,
      text: `My ticket for ${ticket.event.name}`,
      url: publicUrl,
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        /* user dismissed */
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-md mx-auto px-4 py-8">
        <Link
          href={`/tickets/${eventId}`}
          className="inline-flex items-center gap-1.5 text-sm mb-6 hover:opacity-80 transition-opacity"
          style={{ color: MUTED }}
        >
          <ArrowLeft size={14} />
          Back to tickets
        </Link>

        <div
          className="relative rounded-2xl overflow-hidden border"
          style={{
            background: SURFACE,
            borderColor: isVip ? 'rgba(245,200,66,0.3)' : SURFACE_MID,
          }}
        >
          {ticket.event.image && (
            <div className="relative h-48 overflow-hidden">
              <img
                src={ticket.event.image}
                alt=""
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(to top, rgba(8,8,8,0.9) 0%, transparent 50%)',
                }}
              />
              <div className="absolute top-3 right-3">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
                  style={{
                    background: isVip ? GOLD_LIGHT : 'rgba(255,255,255,0.1)',
                    color: isVip ? BG : CREAM,
                    border: `1px solid ${isVip ? GOLD_LIGHT : 'rgba(255,255,255,0.2)'}`,
                  }}
                >
                  {isVip ? '✦ VIP' : 'GENERAL'}
                </span>
              </div>
            </div>
          )}

          <div className="p-6 space-y-5">
            <div>
              <h1 className="text-xl font-bold" style={{ color: CREAM }}>
                {ticket.event.name}
              </h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm" style={{ color: MUTED }}>
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} />
                  {ticket.event.venue}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {eventDate}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: MUTED }}>
                {eventTime} Onwards
              </p>
            </div>

            {isCancelled && (
              <div
                className="text-sm font-semibold text-center py-2 px-4 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}
              >
                This ticket has been cancelled
              </div>
            )}
            {isUsed && ticket.checkIn && (
              <div
                className="text-sm font-semibold text-center py-2 px-4 rounded-lg"
                style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}
              >
                Checked in — {new Date(ticket.checkIn.scannedAt).toLocaleString('en-US', {
                  dateStyle: 'medium', timeStyle: 'short',
                })}
              </div>
            )}

            <div className="border-t border-dashed" style={{ borderColor: SURFACE_MID }} />

            <div className="flex items-start gap-5">
              <div className="flex-1 min-w-0 space-y-3">
                {ticket.attendeeName && (
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: GOLD }}>
                      Attendee
                    </p>
                    <p className="font-semibold" style={{ color: CREAM }}>
                      {ticket.attendeeName}
                    </p>
                  </div>
                )}
                {ticket.attendeeEmail && (
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: GOLD }}>
                      Email
                    </p>
                    <p className="text-sm" style={{ color: MUTED }}>
                      {ticket.attendeeEmail}
                    </p>
                  </div>
                )}
                {ticket.distributorName && (
                  <div>
                    <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: GOLD }}>
                      Distributor
                    </p>
                    <p className="text-sm" style={{ color: MUTED }}>
                      {ticket.distributorName}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs uppercase tracking-wider mb-0.5" style={{ color: GOLD }}>
                    Ticket ID
                  </p>
                  <p className="text-xs font-mono" style={{ color: MUTED }}>
                    {ticket.id.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="shrink-0">
                <div
                  className="rounded-xl p-2"
                  style={{
                    background: '#ffffff',
                    border: `2px solid ${isVip ? GOLD_LIGHT : GOLD}`,
                  }}
                >
                  <img
                    src={ticket.qrDataUrl}
                    alt="Entry QR Code"
                    className="w-32 h-32 block"
                  />
                </div>
                <p
                  className="text-[9px] text-center mt-1.5 uppercase tracking-widest"
                  style={{ color: GOLD }}
                >
                  Scan for entry
                </p>
              </div>
            </div>

            {ticket.event.description && (
              <>
                <div className="border-t border-dashed" style={{ borderColor: SURFACE_MID }} />
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  {ticket.event.description}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl transition-opacity hover:opacity-90"
            style={{ background: GOLD, color: BG }}
          >
            <Download size={15} />
            Download
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 text-sm font-semibold py-3 rounded-xl border transition-opacity hover:opacity-90"
            style={{ borderColor: SURFACE_MID, color: CREAM }}
          >
            {copied ? <Check size={15} /> : <Share2 size={15} />}
            {copied ? 'Link copied' : 'Share'}
          </button>
        </div>

        <a
          href={`/ticket/${ticket.token}`}
          target="_blank"
          className="block w-full mt-3 text-center text-sm font-semibold py-3 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: SURFACE, color: MUTED, border: `1px solid ${SURFACE_MID}` }}
        >
          View Public Ticket ↗
        </a>
      </div>
    </div>
  )
}
