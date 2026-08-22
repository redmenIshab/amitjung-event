'use client'

import { useState } from 'react'
import {
  ScanLine,
  Ban,
  Undo2,
  TicketPlus,
  ShoppingCart,
  UserPlus,
  Trash2,
  type LucideIcon,
} from 'lucide-react'

export type ActivityAction =
  | 'ISSUED'
  | 'PURCHASED'
  | 'SELF_REGISTERED'
  | 'SCANNED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'DELETED'

export interface ActivityRow {
  id: string
  action: ActivityAction
  ticketId: string | null
  paymentId: string | null
  quantity: number
  actorLabel: string
  actorRole: string | null
  reason: string | null
  amount: number | null
  meta: Record<string, unknown> | null
  createdAt: string
}

/** Icon + tone per action. Destructive actions read hot; routine ones stay quiet. */
const STYLE: Record<ActivityAction, { icon: LucideIcon; tone: string; label: string }> = {
  SCANNED: { icon: ScanLine, tone: 'text-emerald-700 bg-emerald-50', label: 'Scanned' },
  CANCELLED: { icon: Ban, tone: 'text-red-700 bg-red-50', label: 'Cancelled' },
  REFUNDED: { icon: Undo2, tone: 'text-amber-700 bg-amber-50', label: 'Refunded' },
  ISSUED: { icon: TicketPlus, tone: 'text-gold-deep bg-gold/10', label: 'Issued' },
  PURCHASED: { icon: ShoppingCart, tone: 'text-blue-700 bg-blue-50', label: 'Purchased' },
  SELF_REGISTERED: { icon: UserPlus, tone: 'text-gray-600 bg-gray-100', label: 'Registered' },
  DELETED: { icon: Trash2, tone: 'text-red-700 bg-red-50', label: 'Deleted' },
}

/** The three the log exists for; the rest are grouped under "Other". */
const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'SCANNED', label: 'Scans' },
  { key: 'CANCELLED', label: 'Cancels' },
  { key: 'REFUNDED', label: 'Refunds' },
  { key: 'CREATED', label: 'Issued' },
] as const

const CREATED: ActivityAction[] = ['ISSUED', 'PURCHASED', 'SELF_REGISTERED']

const npr = (n: number) => `NPR ${n.toLocaleString()}`

function subject(row: ActivityRow) {
  if (row.quantity > 1) return `${row.quantity} tickets`
  if (row.ticketId) return `ticket ${row.ticketId.slice(-6)}`
  if (row.paymentId) return `payment ${row.paymentId.slice(-6)}`
  return '—'
}

export function ActivityFeed({
  rows,
  /** Strip mode: a handful of rows on the event page, where filters are noise. */
  compact = false,
}: {
  rows: ActivityRow[]
  compact?: boolean
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('ALL')

  const visible = rows.filter((r) => {
    if (compact || filter === 'ALL') return true
    if (filter === 'CREATED') return CREATED.includes(r.action)
    return r.action === filter
  })

  return (
    <div className="space-y-4">
      <div
        className={`flex-wrap gap-1 rounded-md bg-gray-100 p-0.5 text-xs w-fit ${
          compact ? 'hidden' : 'flex'
        }`}
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded px-3 py-1.5 font-medium transition-colors ${
              filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-500 bg-gray-50 border border-black/5 rounded-md px-3 py-3">
          {rows.length === 0
            ? 'No activity recorded for this event yet.'
            : 'No activity of this kind.'}
        </p>
      ) : (
        <ol className="space-y-1">
          {visible.map((row) => {
            const { icon: Icon, tone, label } = STYLE[row.action]
            const used = (row.meta?.alreadyUsed as number | undefined) ?? 0
            const wasUsed = row.meta?.wasUsed === true
            return (
              <li
                key={row.id}
                className="flex items-start gap-3 rounded-lg border bg-white px-3 py-2.5"
              >
                <span className={`rounded-md p-1.5 shrink-0 ${tone}`}>
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{label}</span>{' '}
                    <span className="text-gray-600">{subject(row)}</span>
                    {row.amount !== null && (
                      <span className="text-gray-600"> · {npr(row.amount)}</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {row.actorLabel}
                    {row.actorRole && ` · ${row.actorRole}`}
                  </p>
                  {row.reason && (
                    <p className="text-xs text-gray-600 mt-0.5 italic">“{row.reason}”</p>
                  )}
                  {(used > 0 || wasUsed) && (
                    <p className="text-xs text-amber-800 mt-0.5">
                      {wasUsed
                        ? 'Ticket had already been checked in — the scan record stands.'
                        : `${used} ticket${used === 1 ? ' had' : 's had'} already been checked in.`}
                    </p>
                  )}
                </div>
                <time
                  className="text-xs text-gray-400 shrink-0 tabular-nums"
                  dateTime={row.createdAt}
                >
                  {new Date(row.createdAt).toLocaleString()}
                </time>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
