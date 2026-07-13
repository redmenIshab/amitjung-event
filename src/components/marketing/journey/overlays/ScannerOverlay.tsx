import { OverlayShell } from './OverlayShell'

const LEGEND = [
  { dot: '#4ADE80', label: 'Checked in — valid ticket' },
  { dot: '#F5C842', label: 'Already used — duplicate blocked' },
  { dot: '#F87171', label: 'Invalid — fake or tampered' },
]

export function ScannerOverlay() {
  return (
    <OverlayShell label="THE SCANNER">
      <h2 className="font-cormorant font-bold text-ivory text-4xl md:text-5xl mb-6 leading-tight">
        See every scan, live.
      </h2>
      <p className="text-ash text-lg leading-relaxed mb-8">
        Every code is validated on our servers the instant it’s scanned. Your gate staff see a
        clear, colour-coded result — and you watch the whole operation update in real time from
        one dashboard.
      </p>
      <ul className="flex flex-col gap-3">
        {LEGEND.map((l) => (
          <li key={l.label} className="flex items-center gap-3 text-ash text-sm">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: l.dot }} />
            {l.label}
          </li>
        ))}
      </ul>
    </OverlayShell>
  )
}
