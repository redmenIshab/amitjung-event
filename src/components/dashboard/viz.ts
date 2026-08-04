/**
 * Chart tokens for the Control Center.
 *
 * Every color here was checked with the data-viz validator against the actual
 * chart surface (white cards, `#ffffff`) — not chosen by eye:
 *
 *  - `SERIES` (gold-deep) is the brand gold at a step that clears 3:1 on white.
 *    The lighter brand gold `#c8922a` measures 2.76:1 and was rejected.
 *  - Gold must NEVER sit next to red in one chart: gold-deep↔red is ΔE 4.8 for
 *    protanopia — indistinguishable. Multi-series charts therefore use `MULTI`
 *    (green/blue/red), which passes every check as a set.
 *  - `CONTEXT` is the de-emphasis gray for the "highlight one, gray the rest"
 *    comparison chart.
 *
 * The admin panel is light-only (the panel layout hardcodes `bg-[#f7f6f3]`),
 * so there is no dark step to maintain here.
 */

/** Single-series accent — trends, ranked bars, sales curves. */
export const SERIES = '#8b5e10'

/** De-emphasis gray for emphasis charts (peers that aren't the subject). */
export const CONTEXT = '#c3c2b7'

/**
 * Validated three-color set for part-to-whole and multi-series charts.
 * Order is the CVD-safety mechanism — do not reorder without re-validating.
 */
export const MULTI = {
  /** Checked in — a completed, good state. */
  good: '#0ca30c',
  /** Awaiting / neutral. */
  neutral: '#2a78d6',
  /** Cancelled / refunded. */
  bad: '#d03b3b',
} as const

/** Chart chrome. Gridlines are solid hairlines — dashed grids read as thresholds. */
export const CHROME = {
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  muted: '#898781',
  surface: '#ffffff',
} as const

/** Bars never fill their band; the leftover is air. */
export const MAX_BAR = 24

/** Whole rupees — the schema stores Int, so no decimals anywhere. */
export function npr(amount: number): string {
  return `Rs ${amount.toLocaleString('en-IN')}`
}

/**
 * Money that may be unknown. Renders "—" for null so an unset commission rate
 * can never be mistaken for zero income.
 */
export function nprOrDash(amount: number | null): string {
  return amount === null ? '—' : npr(amount)
}

/** Compact form for stat tiles, where a 7-digit rupee value would overflow. */
export function nprCompact(amount: number): string {
  if (Math.abs(amount) >= 10_000_000) return `Rs ${(amount / 10_000_000).toFixed(2)} Cr`
  if (Math.abs(amount) >= 100_000) return `Rs ${(amount / 100_000).toFixed(2)} L`
  if (Math.abs(amount) >= 1_000) return `Rs ${(amount / 1_000).toFixed(1)}K`
  return `Rs ${amount}`
}

export function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function shortHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
}
