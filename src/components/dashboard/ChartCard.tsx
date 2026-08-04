'use client'

import { useState } from 'react'
import { Table2, BarChart3 } from 'lucide-react'

/**
 * Chart shell providing the **table-view twin** every chart needs: a tooltip
 * must never be the only way to read a value, and color must never be the only
 * encoding. The toggle gives a WCAG-clean equivalent of the same data.
 *
 * The container is not fixed-height — it grows with its content so the x-axis
 * band is never cropped into a nested scrollbar.
 */
export function ChartCard({
  title,
  subtitle,
  /** Column headers for the table view. */
  columns,
  /** Same data as the chart, one array per row. */
  rows,
  empty,
  /**
   * Stable id on the plot wrapper, so the PDF exporter can find this chart's
   * <svg> in the DOM. Absent while the table view is showing — the exporter
   * treats a missing chart as skippable.
   */
  chartId,
  children,
}: {
  title: string
  subtitle?: string
  columns: string[]
  rows: (string | number)[][]
  /** Shown instead of the chart when there is nothing to plot. */
  empty?: string
  chartId?: string
  children: React.ReactNode
}) {
  const [asTable, setAsTable] = useState(false)
  const isEmpty = rows.length === 0

  return (
    <section className="bg-white border border-black/5 rounded-lg p-4 shadow-sm">
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {!isEmpty && (
          <button
            type="button"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 border border-black/10 rounded-md px-2 py-1 transition-colors"
          >
            {asTable ? <BarChart3 size={13} /> : <Table2 size={13} />}
            {asTable ? 'Chart' : 'Table'}
          </button>
        )}
      </header>

      {isEmpty ? (
        <p className="h-40 flex items-center justify-center text-sm text-gray-400 text-center px-4">
          {empty ?? 'No data yet.'}
        </p>
      ) : asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10">
                {columns.map((c, i) => (
                  <th
                    key={c}
                    scope="col"
                    className={`py-2 px-2 text-xs font-medium text-gray-500 ${
                      i === 0 ? 'text-left' : 'text-right'
                    }`}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-black/[0.04] last:border-0">
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className={`py-1.5 px-2 ${
                        ci === 0
                          ? 'text-left text-gray-900'
                          : 'text-right text-gray-600 tabular-nums'
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div id={chartId}>{children}</div>
      )}
    </section>
  )
}
