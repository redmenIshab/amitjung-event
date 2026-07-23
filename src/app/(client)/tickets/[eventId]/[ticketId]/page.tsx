'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Loader2, Download, Share2, Check } from 'lucide-react'
import { z } from 'zod'
import { ticketDetailResponseSchema } from '@/lib/validations'

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

    fetch(`/api/tickets/mine/${eventId}/${ticketId}`)
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-red-400">{error || 'Ticket not found'}</p>
      </div>
    )
  }

  const isVip = ticket.category === 'VIP'
  const isUsed = ticket.status === 'USED'
  const isCancelled = ticket.status === 'CANCELLED'
  // Once the event is completed the ticket is retired: no more downloads,
  // sharing, or public-view actions.
  const isCompleted = ticket.event.status === 'COMPLETED'

  const eventDate = new Date(ticket.event.bookingDeadline).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const eventTime = new Date(ticket.event.bookingDeadline).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/ticket/${ticket.token}` : ''

  async function handleDownload() {
    if (!ticket || ticket.event.status === 'COMPLETED') return
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
    if (!ticket || ticket.event.status === 'COMPLETED') return
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
    <main className="max-w-md mx-auto px-5 md:px-8 pt-10 md:pt-14 pb-24">
      <Link
        href={`/tickets/${eventId}`}
        className="inline-flex items-center gap-1.5 text-sm mb-6 text-ash hover:text-gold transition-colors"
      >
        <ArrowLeft size={14} />
        Back to tickets
      </Link>

      <div
        className={`relative rounded-2xl overflow-hidden border bg-lyante-surface ${
          isCompleted ? 'border-coal/40' : isVip ? 'border-gold-light/30' : 'border-coal/40'
        }`}
      >
        {ticket.event.image && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={ticket.event.image}
              alt=""
              className={`w-full h-full object-cover ${isCompleted ? 'grayscale' : ''}`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-lyante-bg/90 via-transparent to-transparent" />
            {isCompleted && (
              <div className="absolute top-3 left-3">
                <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border bg-coal/60 text-ash border-coal/50">
                  Event completed!
                </span>
              </div>
            )}
            <div className="absolute top-3 right-3">
              <span
                className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                  isVip
                    ? 'bg-gold-light text-lyante-bg border-gold-light'
                    : 'bg-white/10 text-ivory border-white/20'
                }`}
              >
                {isVip ? '✦ VIP' : 'GENERAL'}
              </span>
            </div>
          </div>
        )}

        <div className="p-6 space-y-5">
          <div>
            <h1 className="font-bebas text-3xl text-ivory uppercase tracking-tight leading-none">
              {ticket.event.name}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-ash">
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-gold" />
                {ticket.event.venue}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-gold" />
                {eventDate}
              </span>
            </div>
            <p className="text-xs mt-1 text-ash">{eventTime} Onwards</p>
          </div>

          {isCancelled && (
            <div className="text-sm font-semibold text-center py-2 px-4 rounded-lg bg-red-500/15 text-red-400">
              This ticket has been cancelled
            </div>
          )}
          {isUsed && ticket.checkIn && (
            <div className="text-sm font-semibold text-center py-2 px-4 rounded-lg bg-yellow-500/15 text-yellow-400">
              Checked in — {new Date(ticket.checkIn.scannedAt).toLocaleString('en-US', {
                dateStyle: 'medium', timeStyle: 'short',
              })}
            </div>
          )}
          {isCompleted && (
            <div className="text-sm font-semibold text-center py-2 px-4 rounded-lg bg-coal/30 text-ash">
              Event completed — this ticket is no longer active
            </div>
          )}

          <div className="border-t border-dashed border-coal/40" />

          <div className="flex items-start gap-5">
            <div className="flex-1 min-w-0 space-y-3">
              {ticket.attendeeName && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-0.5 text-gold">Attendee</p>
                  <p className="font-semibold text-ivory">{ticket.attendeeName}</p>
                </div>
              )}
              {ticket.attendeeEmail && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-0.5 text-gold">Email</p>
                  <p className="text-sm text-ash break-all">{ticket.attendeeEmail}</p>
                </div>
              )}
              {ticket.distributorName && (
                <div>
                  <p className="text-[11px] uppercase tracking-widest mb-0.5 text-gold">Distributor</p>
                  <p className="text-sm text-ash">{ticket.distributorName}</p>
                </div>
              )}
              <div>
                <p className="text-[11px] uppercase tracking-widest mb-0.5 text-gold">Ticket ID</p>
                <p className="text-xs font-mono text-ash">{ticket.id.toUpperCase()}</p>
              </div>
            </div>

            <div className="shrink-0">
              <div
                className={`rounded-xl p-2 bg-white border-2 ${
                  isCompleted ? 'border-coal' : isVip ? 'border-gold-light' : 'border-gold'
                }`}
              >
                <img
                  src={ticket.qrDataUrl}
                  alt="Entry QR Code"
                  className={`w-32 h-32 block ${isCompleted ? 'grayscale opacity-60' : ''}`}
                />
              </div>
              <p
                className={`text-[9px] text-center mt-1.5 uppercase tracking-widest ${
                  isCompleted ? 'text-ash' : 'text-gold'
                }`}
              >
                {isCompleted ? 'No longer valid' : 'Scan for entry'}
              </p>
            </div>
          </div>

          {ticket.event.description && (
            <>
              <div className="border-t border-dashed border-coal/40" />
              <p className="text-sm leading-relaxed text-ash">{ticket.event.description}</p>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-6">
        <button
          onClick={handleDownload}
          disabled={isCompleted}
          className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide py-3 rounded-md bg-gold text-lyante-bg hover:bg-gold-light transition-colors cursor-pointer disabled:bg-coal/40 disabled:text-ash disabled:cursor-not-allowed disabled:hover:bg-coal/40"
        >
          <Download size={15} />
          Download
        </button>
        <button
          onClick={handleShare}
          disabled={isCompleted}
          className="flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide py-3 rounded-md border border-coal/40 text-ivory hover:border-gold/50 transition-colors cursor-pointer disabled:text-ash disabled:cursor-not-allowed disabled:hover:border-coal/40"
        >
          {copied ? <Check size={15} /> : <Share2 size={15} />}
          {copied ? 'Link copied' : 'Share'}
        </button>
      </div>

      {isCompleted ? (
        <div
          aria-disabled="true"
          className="block w-full mt-3 text-center text-sm font-medium py-3 rounded-md bg-lyante-surface/60 text-coal border border-coal/30 cursor-not-allowed select-none"
        >
          View Public Ticket ↗
        </div>
      ) : (
        <a
          href={`/ticket/${ticket.token}`}
          target="_blank"
          className="block w-full mt-3 text-center text-sm font-medium py-3 rounded-md bg-lyante-surface text-ash border border-coal/40 hover:border-gold/40 hover:text-ivory transition-colors"
        >
          View Public Ticket ↗
        </a>
      )}
    </main>
  )
}
