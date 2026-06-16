'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Event = {
  id: string
  name: string
  venue: string
  date: Date | string
  isOpen: boolean
  _count: { tickets: number }
}

export function EventList({ events }: { events: Event[] }) {
  if (events.length === 0) {
    return (
      <div className="text-center text-gray-400 py-12 border rounded-lg bg-white">
        No events yet. Create your first event.
      </div>
    )
  }

  return (
    <>
      {/* ── Mobile card list ── */}
      <div className="md:hidden space-y-3">
        {events.map((event) => (
          <div key={event.id} className="bg-white border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">{event.name}</p>
                <p className="text-sm text-gray-500 truncate">{event.venue}</p>
              </div>
              <Badge variant={event.isOpen ? 'default' : 'secondary'} className="shrink-0">
                {event.isOpen ? 'Open' : 'Closed'}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>
                {new Date(event.date).toLocaleDateString()} · {event._count.tickets} tickets
              </span>
              <Link
                href={`/events/${event.id}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
              >
                Manage
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Venue</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Tickets</TableHead>
              <TableHead>Registration</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="font-medium">{event.name}</TableCell>
                <TableCell>{event.venue}</TableCell>
                <TableCell>{new Date(event.date).toLocaleDateString()}</TableCell>
                <TableCell>{event._count.tickets}</TableCell>
                <TableCell>
                  <Badge variant={event.isOpen ? 'default' : 'secondary'}>
                    {event.isOpen ? 'Open' : 'Closed'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/events/${event.id}`}
                    className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                  >
                    Manage
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
