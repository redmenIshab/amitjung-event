'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, Ticket, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { ticketsMineResponseSchema } from '@/lib/validations'

export default function MyTicketsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [groups, setGroups] = useState<z.infer<typeof ticketsMineResponseSchema>['groups']>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }
    if (status !== 'authenticated' || !session) return

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    fetch(`${baseUrl}/api/tickets/mine`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load tickets')
        return r.json()
      })
      .then((raw) => {
        const data = ticketsMineResponseSchema.parse(raw)
        setGroups(data.groups)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load tickets')
        setLoading(false)
      })
  }, [session, status, router])

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#080808' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: '#9a9590' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#080808' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6" style={{ color: '#f0ede6' }}>My Tickets</h1>

        {error ? (
          <div className="text-center py-16">
            <p style={{ color: '#ef4444' }}>{error}</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-16">
            <Ticket className="mx-auto mb-4" size={48} style={{ color: '#4a4744' }} />
            <p className="mb-4" style={{ color: '#9a9590' }}>No tickets yet</p>
            <Link
              href="/events"
              className="inline-block font-semibold px-6 py-2.5 hover:opacity-90 transition-opacity"
              style={{ background: '#c8922a', color: '#080808' }}
            >
              Browse Events
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => {
              const eventDate = new Date(group.event.bookingDeadline).toLocaleDateString('en-US', {
                weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
              })

              return (
                <Link
                  key={group.event.id}
                  href={`/tickets/${group.event.id}`}
                  className="block overflow-hidden border transition-colors"
                  style={{ background: '#111111', borderColor: '#1c1c1c' }}
                >
                  <div className="flex items-center">
                    {group.event.image && (
                      <div className="w-20 h-20 shrink-0">
                        <img
                          src={group.event.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-lg font-bold" style={{ color: '#f0ede6' }}>
                          {group.event.name}
                        </h2>
                        <span
                          className="shrink-0 text-xs font-semibold uppercase tracking-wider px-2 py-1"
                          style={{ background: 'rgba(200,146,42,0.15)', color: '#c8922a' }}
                        >
                          ×{group.count}
                        </span>
                      </div>
                      <p className="text-sm mt-1 flex items-center gap-1.5" style={{ color: '#9a9590' }}>
                        <MapPin size={12} />
                        {group.event.venue}
                      </p>
                      <p className="text-sm flex items-center gap-1.5 mt-0.5" style={{ color: '#9a9590' }}>
                        <Calendar size={12} />
                        {eventDate}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
