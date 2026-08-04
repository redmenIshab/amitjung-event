/**
 * Builds the per-event analytics PDF, client-side.
 *
 * Why this is drawn with jsPDF primitives rather than screenshotting the page
 * (the approach `captureTicketPdf.ts` uses): html2canvas cannot parse Tailwind
 * v4's oklch/lab colors. That helper works around it by stripping every
 * stylesheet, which is only survivable because the ticket is inline-styled. The
 * analytics page is entirely class-driven, so the same trick would render a
 * blank page. Drawing the report explicitly also gives selectable, searchable
 * text and a file measured in KB rather than MB.
 *
 * Charts are the one exception: their Recharts <svg> is serialised and
 * rasterised. Each embed is independently guarded — a chart that fails to
 * rasterise is skipped with a note, and the figures it illustrated are always
 * present as text, so the report is never missing data because an image failed.
 */

export interface AnalyticsPdfInput {
  event: {
    name: string
    venue: string
    date: string
    status: string
    eventType: string
    artistName: string | null
    capacity: number
    ticketsAvailable: number
    baseTicketPrice: number
  }
  /** Omitted entirely for users without FINANCE_READ — never merely hidden. */
  money: {
    grossSales: number
    refunds: number
    netCollected: number
    commissionIncome: number | null
    commissionRate: number | null
    averageTicketPrice: number | null
  } | null
  tickets: {
    total: number
    paid: number
    comped: number
    checkedIn: number
    awaiting: number
    cancelled: number
  }
  sellThrough: number
  checkInRate: number
  peers: {
    rankByNet: number | null
    totalRanked: number
    medianNet: number
    medianSellThrough: number
    netVsMedian: number | null
    rows: { name: string; net: number; isSubject: boolean }[]
  } | null
  /** DOM ids of chart containers to rasterise, with captions. */
  charts: { id: string; caption: string }[]
}

const MARGIN = 16
const PAGE_W = 210 // A4 portrait, mm
const PAGE_H = 297
const CONTENT_W = PAGE_W - MARGIN * 2

const rs = (n: number) => `Rs ${n.toLocaleString('en-IN')}`
const rsOrDash = (n: number | null) => (n === null ? '—' : rs(n))

/**
 * Serialises a chart's <svg> and rasterises it via canvas.
 * Returns null on any failure so the caller can skip it cleanly.
 */
async function rasterizeChart(containerId: string): Promise<{ dataUrl: string; ratio: number } | null> {
  try {
    const container = document.getElementById(containerId)
    if (!container) return null

    // Pick the largest <svg> by rendered area — do NOT trust document order or
    // the class name. Recharts tags each legend swatch `recharts-surface` too,
    // exactly like the plot, and on a legend-bearing chart the swatches come
    // FIRST in the DOM. Selecting by class or by `querySelector` therefore put a
    // 9x9 legend dot in the report where the chart should have been.
    const svg = [...container.querySelectorAll('svg')]
      .map((s) => {
        const r = s.getBoundingClientRect()
        return { s, area: r.width * r.height }
      })
      .sort((a, b) => b.area - a.area)[0]?.s
    if (!svg) return null

    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null

    const clone = svg.cloneNode(true) as SVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width', String(rect.width))
    clone.setAttribute('height', String(rect.height))
    // Recharts sets presentation attributes inline, but axis text inherits its
    // font from CSS — restate it so the raster doesn't fall back to serif.
    clone.setAttribute('style', 'font-family: Helvetica, Arial, sans-serif')

    const svgText = new XMLSerializer().serializeToString(clone)
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`

    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('svg decode failed'))
      img.src = url
    })

    // 1.5× is enough for the ~180mm print width. Lossless PNG at 2× produced an
    // 8MB file for three charts — unusable for emailing a 3-page report — so
    // these go out as JPEG on an opaque white ground.
    const scale = 1.5
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(rect.width * scale)
    canvas.height = Math.round(rect.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    return { dataUrl: canvas.toDataURL('image/jpeg', 0.85), ratio: rect.height / rect.width }
  } catch {
    return null
  }
}

export async function buildAnalyticsPdf(input: AnalyticsPdfInput): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  let y = MARGIN

  /** Adds a page when the next block wouldn't fit, and returns the cursor. */
  const ensure = (needed: number) => {
    if (y + needed > PAGE_H - MARGIN) {
      pdf.addPage()
      y = MARGIN
    }
  }

  const heading = (text: string) => {
    ensure(14)
    pdf.setFont('helvetica', 'bold').setFontSize(11).setTextColor(20)
    pdf.text(text.toUpperCase(), MARGIN, y)
    y += 2
    pdf.setDrawColor(200).setLineWidth(0.3)
    pdf.line(MARGIN, y, PAGE_W - MARGIN, y)
    y += 6
  }

  /** Two-column label/value rows — the report's main workhorse. */
  const rows = (pairs: [string, string][]) => {
    pdf.setFontSize(10)
    for (const [label, value] of pairs) {
      ensure(7)
      pdf.setFont('helvetica', 'normal').setTextColor(90)
      pdf.text(label, MARGIN, y)
      pdf.setFont('helvetica', 'bold').setTextColor(20)
      pdf.text(value, PAGE_W - MARGIN, y, { align: 'right' })
      y += 6
    }
    y += 2
  }

  const note = (text: string) => {
    pdf.setFont('helvetica', 'italic').setFontSize(8.5).setTextColor(130)
    const lines = pdf.splitTextToSize(text, CONTENT_W)
    ensure(lines.length * 4 + 2)
    pdf.text(lines, MARGIN, y)
    y += lines.length * 4 + 3
  }

  // ── Title block ──
  pdf.setFont('helvetica', 'bold').setFontSize(17).setTextColor(20)
  const titleLines = pdf.splitTextToSize(input.event.name, CONTENT_W)
  pdf.text(titleLines, MARGIN, y)
  y += titleLines.length * 7

  pdf.setFont('helvetica', 'normal').setFontSize(9.5).setTextColor(110)
  const meta = [
    input.event.venue,
    new Date(input.event.date).toLocaleDateString(),
    input.event.status,
    input.event.eventType,
    input.event.artistName,
  ]
    .filter(Boolean)
    .join('  ·  ')
  pdf.text(meta, MARGIN, y)
  y += 5
  pdf.setFontSize(8.5).setTextColor(140)
  pdf.text(
    `Lyante Production · event analytics · generated ${new Date().toLocaleString()}`,
    MARGIN,
    y,
  )
  y += 9

  // ── Financial (only when the viewer was granted it) ──
  if (input.money) {
    const m = input.money
    heading('Financial')
    rows([
      ['Gross ticket sales', rs(m.grossSales)],
      ['Refunds', rs(m.refunds)],
      ['Net collected', rs(m.netCollected)],
      [
        m.commissionRate === null
          ? 'Lyante commission (no rate on record)'
          : `Lyante commission (${m.commissionRate}% of net)`,
        rsOrDash(m.commissionIncome),
      ],
      ['Average paid ticket', rsOrDash(m.averageTicketPrice)],
      ['List price', rs(input.event.baseTicketPrice)],
      [
        'Refund rate',
        m.grossSales > 0 ? `${Math.round((m.refunds / m.grossSales) * 100)}%` : '—',
      ],
    ])
    if (m.commissionRate === null) {
      note(
        'No commission rate is recorded for this event, so commission income cannot be calculated. It is shown as "—" rather than zero to avoid implying no income was due.',
      )
    }
    note('Commission is charged on net collections; refunded sales earn none.')
  } else {
    heading('Financial')
    note('Financial figures are restricted to administrators and are omitted from this report.')
  }

  // ── Inventory & attendance ──
  const sold = input.tickets.total - input.tickets.cancelled
  heading('Inventory & attendance')
  rows([
    ['Capacity', input.event.capacity.toLocaleString()],
    ['Offered for sale', input.event.ticketsAvailable.toLocaleString()],
    ['Sold', sold.toLocaleString()],
    ['Sell-through', `${input.sellThrough}%`],
    ['Remaining', Math.max(0, input.event.ticketsAvailable - sold).toLocaleString()],
    ['Checked in', `${input.tickets.checkedIn.toLocaleString()} (${input.checkInRate}%)`],
    ['Awaiting check-in', input.tickets.awaiting.toLocaleString()],
    ['Cancelled', input.tickets.cancelled.toLocaleString()],
    ['Paid tickets', input.tickets.paid.toLocaleString()],
    ['Comped (admin-issued, no revenue)', input.tickets.comped.toLocaleString()],
  ])

  // ── Peer comparison ──
  if (input.peers && input.peers.rankByNet !== null) {
    const p = input.peers
    heading('Against other events')
    rows([
      ['Rank by net sales', `#${p.rankByNet} of ${p.totalRanked}`],
      ['Median event net', rs(p.medianNet)],
      [
        'This event vs median',
        p.netVsMedian === null ? '—' : `${p.netVsMedian > 0 ? '+' : ''}${p.netVsMedian}%`,
      ],
      ['Sell-through vs median', `${input.sellThrough}% vs ${p.medianSellThrough}%`],
    ])

    pdf.setFontSize(9)
    for (const row of p.rows) {
      ensure(6)
      pdf.setFont('helvetica', row.isSubject ? 'bold' : 'normal').setTextColor(row.isSubject ? 20 : 100)
      const name = pdf.splitTextToSize(row.name, CONTENT_W - 40)[0]
      pdf.text(row.isSubject ? `${name}  (this event)` : name, MARGIN, y)
      pdf.text(rs(row.net), PAGE_W - MARGIN, y, { align: 'right' })
      y += 5.5
    }
    y += 4
  } else if (input.peers) {
    heading('Against other events')
    note(
      'Not enough events with sales on the platform yet to draw a comparison. This section fills in once a second event has recorded sales.',
    )
  }

  // ── Charts ──
  if (input.charts.length > 0) {
    heading('Charts')
    for (const chart of input.charts) {
      const raster = await rasterizeChart(chart.id)
      if (!raster) {
        note(`${chart.caption}: chart image unavailable — see the figures above.`)
        continue
      }
      const h = Math.min(CONTENT_W * raster.ratio, 90)
      ensure(h + 10)
      pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90)
      pdf.text(chart.caption, MARGIN, y)
      y += 4
      pdf.addImage(raster.dataUrl, 'JPEG', MARGIN, y, CONTENT_W, h)
      y += h + 7
    }
  }

  // Page numbers, added last so the total is known.
  const pages = pdf.getNumberOfPages()
  for (let i = 1; i <= pages; i += 1) {
    pdf.setPage(i)
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(150)
    pdf.text(`Page ${i} of ${pages}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' })
  }

  const slug = input.event.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
  pdf.save(`analytics-${slug || 'event'}-${new Date().toISOString().slice(0, 10)}.pdf`)
}
