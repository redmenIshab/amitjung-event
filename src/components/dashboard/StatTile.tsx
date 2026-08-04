import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Stat tile — the right form for a single number. A one-bar bar chart is not.
 *
 * `value` uses proportional figures (no tabular-nums): equal-width digits make
 * a large standalone number look loose.
 */
export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  accent = 'text-gray-500 bg-gray-100',
  delta,
}: {
  label: string
  value: string | number
  /** Supporting detail — the breakdown behind the headline. */
  hint?: string
  icon?: LucideIcon
  accent?: string
  /** Signed percent vs a named baseline. Null renders nothing (no baseline). */
  delta?: { value: number | null; label: string; upIsGood?: boolean }
}) {
  const d = delta?.value
  const upIsGood = delta?.upIsGood ?? true
  const deltaTone =
    d === null || d === undefined || d === 0
      ? 'text-gray-400'
      : (d > 0) === upIsGood
        ? 'text-emerald-700'
        : 'text-red-600'

  return (
    <Card className="border-black/5 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${accent}`}
            >
              <Icon size={18} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-semibold text-gray-900 leading-tight mt-0.5 truncate">
              {value}
            </p>
            {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
            {delta && d !== null && d !== undefined && (
              <p className={`text-xs mt-1 ${deltaTone}`}>
                {d > 0 ? '+' : ''}
                {d}% {delta.label}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
