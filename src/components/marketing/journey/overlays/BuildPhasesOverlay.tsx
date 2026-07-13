import { OverlayShell } from './OverlayShell'

const PHASES = [
  {
    k: '01',
    title: 'DISCOVER',
    body: 'Audit, positioning and USP. We learn your business like owners, not vendors.',
  },
  {
    k: '02',
    title: 'DESIGN',
    body: 'Identity, color, type and brand board. The system your brand will live inside.',
  },
  {
    k: '03',
    title: 'DEPLOY',
    body: 'Website, social profiles and Google presence — launched and search-ready.',
  },
  {
    k: '04',
    title: 'AMPLIFY',
    body: 'Content, paid ads and hype — a sustainable engine that keeps compounding.',
  },
]

export function BuildPhasesOverlay() {
  return (
    <OverlayShell wide label="HOW WE BUILD">
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
