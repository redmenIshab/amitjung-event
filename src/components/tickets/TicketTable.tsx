'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Ticket = {
  id: string
  attendeeName: string | null
  attendeeEmail: string | null
  distributorName: string | null
  category: 'GENERAL' | 'VIP'
  status: 'UNUSED' | 'USED' | 'CANCELLED'
  source: 'ADMIN' | 'SELF_REGISTERED'
  createdAt: string
  checkIn: { scannedAt: string } | null
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  UNUSED: 'default',
  USED: 'secondary',
  CANCELLED: 'destructive',
}

const categoryClass =
  'bg-amber-400 text-amber-900 border-amber-400 hover:bg-amber-400'

export function TicketTable({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) {
    return (
      <div className="text-center text-gray-400 py-10 border rounded-lg bg-white">
        No tickets yet.
      </div>
    )
  }

  return (
    <>
      {/* ── Mobile card list ── */}
      <div className="md:hidden space-y-3">
        {tickets.map((ticket) => (
          <div key={ticket.id} className="bg-white border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {ticket.attendeeName ?? ticket.distributorName ?? '—'}
                </p>
                {ticket.attendeeEmail && (
                  <p className="text-xs text-gray-500 truncate">{ticket.attendeeEmail}</p>
                )}
              </div>
              <Badge
                variant={ticket.category === 'VIP' ? 'default' : 'outline'}
                className={ticket.category === 'VIP' ? categoryClass : 'text-xs shrink-0'}
              >
                {ticket.category}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {ticket.source === 'SELF_REGISTERED' ? 'Self-reg' : 'Admin'}
              </Badge>
              <Badge variant={statusVariant[ticket.status]}>{ticket.status}</Badge>
              {ticket.checkIn && (
                <span className="text-xs text-gray-400">
                  ✓ {new Date(ticket.checkIn.scannedAt).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Attendee / Distributor</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Check-in Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-medium">
                  {ticket.attendeeName ?? (
                    <span className="text-gray-500 italic">
                      {ticket.distributorName ?? '—'}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-gray-500">{ticket.attendeeEmail ?? '—'}</TableCell>
                <TableCell>
                  <Badge
                    variant={ticket.category === 'VIP' ? 'default' : 'outline'}
                    className={ticket.category === 'VIP' ? categoryClass : 'text-xs'}
                  >
                    {ticket.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {ticket.source === 'SELF_REGISTERED' ? 'Self-reg' : 'Admin'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[ticket.status]}>{ticket.status}</Badge>
                </TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {ticket.checkIn
                    ? new Date(ticket.checkIn.scannedAt).toLocaleString()
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
