import { OverlayShell } from './OverlayShell'

const FEATURES = [
  {
    title: 'Unique QR per Ticket',
    body: 'Every ticket carries its own cryptographically-signed code. No two are alike, and none can be guessed or generated.',
  },
  {
    title: 'One-Time-Only Validity',
    body: 'A code works exactly once. The moment it’s scanned, re-entry on the same ticket is blocked.',
  },
  {
    title: 'Tamper-Proof by Design',
    body: 'Server-side validation on every scan. Screenshots, copies and edited codes are rejected instantly.',
  },
  {
    title: 'Distribution Stalls',
    body: 'We set up and staff on-ground sale & collection points so buyers get tickets fast, in person.',
  },
  {
    title: 'Digital Payments',
    body: 'Khalti and eSewa checkout built in, with instant ticket delivery to the buyer.',
  },
  {
    title: 'Live Reports & Reconciliation',
    body: 'Sales, entries and no-shows reconciled in real time and exported after the show.',
  },
]

export function FeaturesOverlay() {
  return (
    <OverlayShell wide label="WHY ORGANIZERS WORK WITH US">
      <div className="grid gap-6 md:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title}>
            <h3 className="font-cormorant font-bold text-ivory text-xl mb-2 leading-tight">
              {f.title}
            </h3>
            <p className="text-ash text-sm leading-relaxed">{f.body}</p>
          </div>
        ))}
      </div>
    </OverlayShell>
  )
}
