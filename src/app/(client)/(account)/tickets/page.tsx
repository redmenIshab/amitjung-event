'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Calendar, MapPin, Ticket, Loader2 } from 'lucide-react'
import { z } from 'zod'
import { ticketsMineResponseSchema } from '@/lib/validations'
import { AccountHeader } from '@/components/tickets/AccountHeader'

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

    fetch(`/api/tickets/mine`)
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-gold" size={32} />
      </div>
    )
  }

  return (
    <main className="max-w-3xl mx-auto px-5 md:px-8 pt-10 md:pt-14 pb-24">
      <AccountHeader title="My Tickets" />

      {error ? (
        <div className="text-center py-20">
          <p className="text-red-400">{error}</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20">
          <Ticket className="mx-auto mb-4 text-coal" size={48} />
          <p className="text-ash mb-6">You don&apos;t have any tickets yet.</p>
          <Link
            href="/events"
            className="inline-block bg-gold text-lyante-bg font-bold uppercase tracking-wide px-6 py-2.5 rounded-md hover:bg-gold-light transition-colors"
          >
            Browse Events
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {groups.map((group) => {
            const eventDate = new Date(group.event.bookingDeadline).toLocaleDateString('en-US', {
              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            })
            const isCompleted = group.event.status === 'COMPLETED'

            return (
              <Link
                key={group.event.id}
                href={`/tickets/${group.event.id}`}
                className={`group block overflow-hidden rounded-lg border bg-lyante-surface transition-colors ${
                  isCompleted ? 'border-coal/40 opacity-60' : 'border-coal/40 hover:border-gold/50'
                }`}
              >
                <div className="flex items-stretch">
                  {group.event.image && (
                    <div className="w-24 h-24 md:w-28 md:h-28 shrink-0 overflow-hidden">
                      <img
                        src={group.event.image}
                        alt=""
                        className={`w-full h-full object-cover transition-all duration-500 ${
                          isCompleted
                            ? 'grayscale'
                            : 'grayscale-[0.25] group-hover:grayscale-0 group-hover:scale-105'
                        }`}
                      />
                    </div>
                  )}
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h2
                        className={`font-bebas text-xl md:text-2xl uppercase tracking-tight leading-none truncate transition-colors ${
                          isCompleted ? 'text-ash' : 'text-ivory group-hover:text-gold-light'
                        }`}
                      >
                        {group.event.name}
                      </h2>
                      <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-gold/15 text-gold">
                        ×{group.count}
                      </span>
                    </div>
                    {isCompleted && (
                      <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-coal/40 text-ash">
                        Event completed!
                      </span>
                    )}
                    <p className="text-sm mt-2 flex items-center gap-1.5 text-ash">
                      <MapPin size={12} className={isCompleted ? 'text-ash' : 'text-gold'} />
                      {group.event.venue}
                    </p>
                    <p className="text-sm flex items-center gap-1.5 mt-1 text-ash">
                      <Calendar size={12} className={isCompleted ? 'text-ash' : 'text-gold'} />
                      {eventDate}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
