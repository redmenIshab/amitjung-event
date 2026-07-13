import { OverlayShell } from './OverlayShell'

const SWATCHES = [
  { name: 'Ink', hex: '#0E1522' },
  { name: 'Gold', hex: '#C8922A' },
  { name: 'Bone', hex: '#E8E2D5' },
  { name: 'Clay', hex: '#B4443C' },
  { name: 'Sage', hex: '#6B8F71' },
]

const FACES = [
  { face: 'font-cormorant italic', label: 'Display · Cormorant' },
  { face: 'font-bebas tracking-wide', label: 'Impact · Bebas Neue' },
  { face: 'font-dm-sans', label: 'Body · DM Sans' },
]

export function BrandBoardOverlay() {
  return (
    <OverlayShell label="THE IDENTITY SYSTEM">
      <h2 className="font-cormorant font-bold text-ivory text-4xl md:text-5xl mb-6 leading-tight">
        One board. Your whole brand.
      </h2>
      <div className="flex flex-wrap gap-4 mb-6">
        {SWATCHES.map((s) => (
          <div key={s.name} className="flex items-center gap-2">
            <span
              className="w-5 h-5 rounded-sm inline-block"
              style={{
                backgroundColor: s.hex,
                border: s.hex === '#E8E2D5' ? 'none' : '1px solid rgba(255,255,255,0.12)',
              }}
            />
            <span className="text-ivory text-sm">{s.name}</span>
            <span className="font-dm-mono text-[11px] text-ash">{s.hex}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        {FACES.map((f) => (
          <span key={f.label} className={`${f.face} text-ivory text-lg`}>
            {f.label}
          </span>
        ))}
      </div>
    </OverlayShell>
  )
}
