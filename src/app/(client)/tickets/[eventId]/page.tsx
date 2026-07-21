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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    fetch(`${baseUrl}/api/tickets/mine/${eventId}`)
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: '#9a9590' }} />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
        <p style={{ color: '#ef4444' }}>{error || 'Event not found'}</p>
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
    <div className="min-h-screen" style={{ background: '#080808' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          href="/tickets"
          className="inline-flex items-center gap-1.5 text-sm mb-6 hover:opacity-80 transition-opacity"
          style={{ color: '#9a9590' }}
        >
          <ArrowLeft size={14} />
          Back to My Tickets
        </Link>

        {event.image && (
          <div className="w-full h-48 overflow-hidden mb-6">
            <img
              src={event.image}
              alt={event.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <h1 className="text-2xl font-bold" style={{ color: '#f0ede6' }}>{event.name}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm" style={{ color: '#9a9590' }}>
          <span className="flex items-center gap-1.5">
            <MapPin size={13} />
            {event.venue}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={13} />
            {eventDate} at {eventTime}
          </span>
        </div>

        {event.description && (
          <p className="mt-3 text-sm leading-relaxed" style={{ color: '#9a9590' }}>
            {event.description}
          </p>
        )}

        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#c8922a' }}>
            Tickets ({tickets.length})
          </h2>

          {tickets.map((t) => (
            <Link
              key={t.id}
              href={`/tickets/${eventId}/${t.id}`}
              className="block overflow-hidden border transition-colors hover:border-[#c8922a]/40"
              style={{ background: '#111111', borderColor: '#1c1c1c' }}
            >
              <div className="flex items-center p-4 gap-4">
                <div className="shrink-0">
                  <img
                    src={t.qrDataUrl}
                    alt="QR Code"
                    className="w-20 h-20"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate" style={{ color: '#f0ede6' }}>
                    {t.attendeeName || 'Unnamed'}
                  </p>
                  {t.attendeeEmail && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#9a9590' }}>
                      {t.attendeeEmail}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5"
                      style={{
                        background: t.category === 'VIP' ? 'rgba(245,200,66,0.2)' : 'rgba(200,146,42,0.1)',
                        color: t.category === 'VIP' ? '#f5c842' : '#c8922a',
                      }}
                    >
                      {t.category}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5"
                      style={{
                        background:
                          t.status === 'UNUSED' ? 'rgba(34,197,94,0.15)' :
                          t.status === 'USED' ? 'rgba(234,179,8,0.15)' :
                          'rgba(239,68,68,0.15)',
                        color:
                          t.status === 'UNUSED' ? '#22c55e' :
                          t.status === 'USED' ? '#eab308' :
                          '#ef4444',
                      }}
                    >
                      {t.status}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: '#4a4744' }}>
                      #{t.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
