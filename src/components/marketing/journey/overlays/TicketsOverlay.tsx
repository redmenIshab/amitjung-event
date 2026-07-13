import { OverlayShell } from './OverlayShell'

export function TicketsOverlay() {
  return (
    <OverlayShell label="EVERY TICKET, ONE OF A KIND">
      <h2 className="font-cormorant font-bold text-ivory text-4xl md:text-5xl mb-6 leading-tight">
        A signed code for every seat.
      </h2>
      <p className="text-ash text-lg leading-relaxed">
        Each ticket is generated with its own tamper-proof QR — event, date, tier and a unique
        signed code baked in. Beautiful to hold, impossible to fake, and valid for exactly one
        entry.
      </p>
    </OverlayShell>
  )
}
