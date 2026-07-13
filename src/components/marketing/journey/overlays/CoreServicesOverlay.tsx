import { OverlayShell } from './OverlayShell'

const SERVICES = [
  {
    label: 'CONTENT CREATION',
    title: 'Content that stops the scroll.',
    body: 'Photo, video, reels, graphics and copy — planned on a calendar and shot to a standard that makes your brand look like the biggest name in the room.',
  },
  {
    label: 'SOCIAL MEDIA MANAGEMENT',
    title: 'Accounts that actually grow.',
    body: 'We set up, optimise and run your profiles end to end — posting, engaging and reporting — so your presence stays active, official and always on-brand.',
  },
  {
    label: 'WEBSITE BUILDING',
    title: 'A home base that converts.',
    body: 'Fast, responsive, search-ready websites — from a single landing page to a full experience — wired to your brand system and built to turn visitors into customers.',
  },
]

export function CoreServicesOverlay() {
  return (
    <OverlayShell wide label="CORE SERVICES">
      <div className="grid gap-8 md:grid-cols-3">
        {SERVICES.map((s) => (
          <div key={s.label}>
            <p className="font-dm-mono text-[11px] tracking-[0.25em] text-gold mb-2">{s.label}</p>
            <h3 className="font-cormorant font-bold text-ivory text-2xl mb-3 leading-tight">
              {s.title}
            </h3>
            <p className="text-ash text-sm leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </OverlayShell>
  )
}
