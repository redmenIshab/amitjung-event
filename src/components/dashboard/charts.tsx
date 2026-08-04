'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SERIES, CONTEXT, MULTI, CHROME, MAX_BAR, npr, nprCompact, shortDay, shortHour } from './viz'

/**
 * Chart set for the Control Center dashboards.
 *
 * Shared conventions, applied everywhere:
 *  - gridlines are SOLID hairlines one step off the surface (dashed grids read
 *    as thresholds or projections)
 *  - horizontal gridlines only — vertical ones add ink without aiding reading
 *  - bars capped at 24px with a 4px rounded data-end, square at the baseline
 *  - lines 2px; area fills are a ~10% wash of the series hue, never a block
 *  - one y-axis, always. Two measures of different scale get two charts.
 *  - axis/label text uses ink tokens, never the series color
 */

const axisTick = { fontSize: 11, fill: CHROME.muted }

const tooltipStyle = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 8,
    border: `1px solid ${CHROME.grid}`,
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
  },
  labelStyle: { color: '#52514e', fontWeight: 500 },
} as const

/** Recharts hands formatters `ValueType | undefined`; coerce to a number once here. */
const toNum = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0))

/** Cumulative paid sales for one event. Single series → no legend needed. */
export function SalesCurveChart({
  data,
  offered,
}: {
  data: { day: string; count: number; total: number }[]
  offered: number
}) {
  const chartData = data.map((d) => ({ ...d, label: shortDay(d.day) }))

  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={CHROME.grid} />
        <XAxis dataKey="label" tick={axisTick} stroke={CHROME.axis} tickMargin={8} minTickGap={24} />
        <YAxis
          tick={axisTick}
          stroke={CHROME.axis}
          allowDecimals={false}
          // Scaled to inventory so the curve reads against what was offered,
          // not just its own maximum.
          domain={[0, Math.max(offered, ...chartData.map((d) => d.total))]}
          width={48}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(v, name) => [
            toNum(v).toLocaleString(),
            name === 'total' ? 'Sold to date' : 'Sold that day',
          ]}
        />
        <Area
          isAnimationActive={false}
          type="monotone"
          dataKey="total"
          stroke={SERIES}
          strokeWidth={2}
          fill={SERIES}
          fillOpacity={0.1}
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: CHROME.surface }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Platform sales volume per day. Single series. */
export function SalesTrendChart({ data }: { data: { day: string; count: number }[] }) {
  const chartData = data.map((d) => ({ ...d, label: shortDay(d.day) }))

  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={CHROME.grid} />
        <XAxis dataKey="label" tick={axisTick} stroke={CHROME.axis} tickMargin={8} minTickGap={32} />
        <YAxis tick={axisTick} stroke={CHROME.axis} allowDecimals={false} width={40} />
        <Tooltip {...tooltipStyle} formatter={(v) => [toNum(v).toLocaleString(), 'Purchases']} />
        <Line
          isAnimationActive={false}
          type="monotone"
          dataKey="count"
          stroke={SERIES}
          strokeWidth={2}
          strokeLinecap="round"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 2, stroke: CHROME.surface }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * Events ranked by net sales — horizontal, because event names are long.
 * One series, one color: shading bars by value would double-encode length.
 */
export function TopEventsChart({ data }: { data: { name: string; net: number }[] }) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.name.length > 26 ? `${d.name.slice(0, 25)}…` : d.name,
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 38 + 40)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 56, left: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} stroke={CHROME.grid} />
        <XAxis
          type="number"
          tick={axisTick}
          stroke={CHROME.axis}
          tickFormatter={(v) => nprCompact(toNum(v))}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ ...axisTick, fontSize: 11 }}
          stroke={CHROME.axis}
          width={150}
        />
        <Tooltip {...tooltipStyle} formatter={(v) => [npr(toNum(v)), 'Net collected']} />
        <Bar isAnimationActive={false} dataKey="net" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={MAX_BAR} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/**
 * This event against its peers — the emphasis form: the subject in the accent
 * hue, everything else in the de-emphasis gray. Color follows the entity (which
 * event is the subject), never its rank.
 */
export function PeerComparisonChart({
  data,
}: {
  data: { name: string; net: number; isSubject: boolean }[]
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: d.name.length > 24 ? `${d.name.slice(0, 23)}…` : d.name,
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 34 + 40)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 56, left: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} stroke={CHROME.grid} />
        <XAxis
          type="number"
          tick={axisTick}
          stroke={CHROME.axis}
          tickFormatter={(v) => nprCompact(toNum(v))}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ ...axisTick, fontSize: 11 }}
          stroke={CHROME.axis}
          width={140}
        />
        <Tooltip {...tooltipStyle} formatter={(v) => [npr(toNum(v)), 'Net collected']} />
        <Bar isAnimationActive={false} dataKey="net" radius={[0, 4, 4, 0]} maxBarSize={MAX_BAR}>
          {chartData.map((d) => (
            <Cell key={d.name} fill={d.isSubject ? SERIES : CONTEXT} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/**
 * Ticket status as part-to-whole. Three series, so a legend is mandatory —
 * identity is never color-alone. Uses the validated MULTI set rather than the
 * brand gold, which is indistinguishable from red under protanopia.
 */
export function TicketStatusChart({
  checkedIn,
  awaiting,
  cancelled,
}: {
  checkedIn: number
  awaiting: number
  cancelled: number
}) {
  const data = [{ name: 'Tickets', checkedIn, awaiting, cancelled }]

  return (
    <ResponsiveContainer width="100%" height={128}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
        <XAxis type="number" tick={axisTick} stroke={CHROME.axis} allowDecimals={false} />
        <YAxis type="category" dataKey="name" hide />
        <Tooltip {...tooltipStyle} formatter={(v) => toNum(v).toLocaleString()} />
        <Legend
          iconType="circle"
          iconSize={9}
          wrapperStyle={{ fontSize: 12, paddingTop: 4, color: '#52514e' }}
        />
        {/* 2px surface gap separates the segments — never a stroke around them. */}
        <Bar isAnimationActive={false} dataKey="checkedIn" name="Checked in" stackId="s" fill={MULTI.good} maxBarSize={MAX_BAR} stroke={CHROME.surface} strokeWidth={2} />
        <Bar isAnimationActive={false} dataKey="awaiting" name="Awaiting" stackId="s" fill={MULTI.neutral} maxBarSize={MAX_BAR} stroke={CHROME.surface} strokeWidth={2} />
        <Bar isAnimationActive={false} dataKey="cancelled" name="Cancelled" stackId="s" fill={MULTI.bad} maxBarSize={MAX_BAR} radius={[0, 4, 4, 0]} stroke={CHROME.surface} strokeWidth={2} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Door arrivals per hour for one event. Single series. */
export function CheckInTimelineChart({ data }: { data: { hour: string; count: number }[] }) {
  const chartData = data.map((d) => ({ ...d, label: shortHour(d.hour) }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid vertical={false} stroke={CHROME.grid} />
        <XAxis dataKey="label" tick={axisTick} stroke={CHROME.axis} tickMargin={8} />
        <YAxis tick={axisTick} stroke={CHROME.axis} allowDecimals={false} width={40} />
        <Tooltip {...tooltipStyle} formatter={(v) => [toNum(v).toLocaleString(), 'Scans']} />
        <Bar isAnimationActive={false} dataKey="count" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={MAX_BAR} />
      </BarChart>
    </ResponsiveContainer>
  )
}
