import { OverlayShell } from './OverlayShell'

const PHASES = [
  {
    k: '01',
    title: 'DESIGN',
    body: 'We design and generate your tickets — branded artwork, unique signed QR codes, printed or digital.',
  },
  {
    k: '02',
    title: 'DISTRIBUTE',
    body: 'On-ground stalls plus Khalti / eSewa checkout put tickets in every buyer’s hands, fast.',
  },
  {
    k: '03',
    title: 'SCAN',
    body: 'At the gate, staff scan and validate in real time — valid, duplicate or invalid, instantly.',
  },
  {
    k: '04',
    title: 'REPORT',
    body: 'You watch entries live and get a full reconciled report of sales and attendance after.',
  },
]

export function ScaleOverlay() {
  return (
    <OverlayShell wide label="BUILT FOR 10 LAKH+ TRAFFIC">
      <h2 className="font-cormorant font-bold text-ivory text-3xl md:text-4xl mb-8 leading-tight">
        A million scans, one smooth gate.
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {PHASES.map((p) => (
          <div key={p.k}>
            <p className="font-dm-mono text-[11px] text-gold mb-2">{p.k}</p>
            <h3 className="font-bebas text-ivory text-2xl tracking-wide mb-2">{p.title}</h3>
            <p className="text-ash text-sm leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>
    </OverlayShell>
  )
}
