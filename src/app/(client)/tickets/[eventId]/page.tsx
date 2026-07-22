'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { eventTicketsResponseSchema } from '@/lib/validations'

export default function EventTicketsPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session, status } = useSession()
  const eventId = params.eventId as string

  const [event, setEvent] = useState<z.infer<typeof eventTicketsResponseSchema>['event'] | null>(null)
  const [tickets, setTickets] = useState<z.infer<typeof eventTicketsResponseSchema>['tickets']>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }
    if (status !== 'authenticated' || !session || !eventId) return

    fetch(`/api/tickets/mine/${eventId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load tickets')
        return r.json()
      })
      .then((raw) => {
        const data = eventTicketsResponseSchema.parse(raw)
        setEvent(data.event)
        setTickets(data.tickets)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load tickets')
        setLoading(false)
      })
  }, [session, status, router, eventId])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-red-400">{error || 'Event not found'}</p>
      </div>
    )
  }

  const eventDate = new Date(event.bookingDeadline).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const eventTime = new Date(event.bookingDeadline).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <main className="max-w-2xl mx-auto px-5 md:px-8 pt-10 md:pt-14 pb-24">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-sm mb-6 text-ash hover:text-gold transition-colors"
      >
        <ArrowLeft size={14} />
        Back to My Tickets
      </Link>

      {event.image && (
        <div className="w-full h-52 md:h-60 overflow-hidden rounded-lg border border-coal/40 mb-6 relative">
          <img
            src={event.image}
            alt={event.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-lyante-bg/80 via-transparent to-transparent" />
        </div>
      )}

      <p className="section-label tracking-widest text-gold mb-2">Your Tickets</p>
      <h1 className="font-bebas text-ivory text-[40px] md:text-[52px] leading-[0.85] tracking-tight uppercase">
        {event.name}
      </h1>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-ash">
        <span className="flex items-center gap-1.5">
          <MapPin size={13} className="text-gold" />
          {event.venue}
        </span>
        <span className="flex items-center gap-1.5">
          <Calendar size={13} className="text-gold" />
          {eventDate} at {eventTime}
        </span>
      </div>

      {event.description && (
        <p className="mt-4 text-sm leading-relaxed text-ash">
          {event.description}
        </p>
      )}

      <div className="mt-8 space-y-3">
        <h2 className="section-label tracking-widest text-gold">
          Tickets ({tickets.length})
        </h2>

        {tickets.map((t) => (
          <Link
            key={t.id}
            href={`/tickets/${eventId}/${t.id}`}
            className="group block overflow-hidden rounded-lg border border-coal/40 bg-lyante-surface hover:border-gold/50 transition-colors"
          >
            <div className="flex items-center p-4 gap-4">
              <div className="shrink-0 rounded-md bg-white p-1.5">
                <img
                  src={t.qrDataUrl}
                  alt="QR Code"
                  className="w-16 h-16 block"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ivory truncate group-hover:text-gold-light transition-colors">
                  {t.attendeeName || 'Unnamed'}
                </p>
                {t.attendeeEmail && (
                  <p className="text-xs mt-0.5 truncate text-ash">
                    {t.attendeeEmail}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      t.category === 'VIP' ? 'bg-gold-light/20 text-gold-light' : 'bg-gold/10 text-gold'
                    }`}
                  >
                    {t.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      t.status === 'UNUSED'
                        ? 'bg-green-500/15 text-green-400'
                        : t.status === 'USED'
                          ? 'bg-yellow-500/15 text-yellow-400'
                          : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {t.status}
                  </span>
                  <span className="text-[10px] font-mono text-coal">
                    #{t.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
