import { OverlayShell } from './OverlayShell'

const ITEMS = [
  'Brand Strategy & Positioning',
  'USP Development',
  'Visual Identity & Logo',
  'Color Systems',
  'Typography',
  'Brand Boards & Guidelines',
  'Website Design & Build',
  'Social Media Accounts',
  'Local SEO & Google Presence',
  'Content Planning & Creation',
  'Paid Ads & Boosting',
  'Hype Building & Launch Buzz',
]

export function DeliverablesOverlay() {
  return (
    <OverlayShell wide label="WHAT YOU GET">
      <h2 className="font-cormorant font-bold text-ivory text-4xl md:text-5xl mb-8 leading-tight">
        Every deliverable, one team.
      </h2>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3">
        {ITEMS.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <span className="text-gold mt-0.5">✓</span>
            <span className="text-ivory text-sm md:text-base">{item}</span>
          </li>
        ))}
      </ul>
    </OverlayShell>
  )
}
