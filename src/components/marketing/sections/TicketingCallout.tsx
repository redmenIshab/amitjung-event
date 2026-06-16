import Button from '@/components/marketing/ui/Button'

const FEATURES = [
  'Unique one-time QR per ticket',
  'Digital payment (eSewa, Khalti)',
  'Real-time camera scanning',
  'Anti-duplication server validation',
  'Lowest cost in market',
]

export default function TicketingCallout() {
  return (
    <section className="py-24 md:py-32 px-4 md:px-20 bg-[#141414]" id="ticketing">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="font-bebas text-gold tracking-widest text-lg mb-4">SMART TICKETING</p>
            <h2
              className="font-cormorant font-bold text-ivory mb-8 leading-tight"
              style={{ fontSize: 'var(--t-display)' }}
            >
              Zero hassle.<br />Zero fakes.
            </h2>
            <ul className="flex flex-col gap-3 mb-10">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 font-mono text-xs text-ash">
                  <span className="text-gold mt-0.5 shrink-0">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Button href="/dashboard" variant="gold">GET A DEMO →</Button>
          </div>

          {/* QR animation */}
          <div className="flex items-center justify-center">
            <div className="relative w-48 h-48 md:w-64 md:h-64">
              <div className="w-full h-full border border-gold/40 rounded-sm p-3 bg-surface grid grid-cols-8 grid-rows-8 gap-[2px]">
                {Array.from({ length: 64 }, (_, i) => (
                  <div
                    key={i}
                    className={`rounded-[1px] ${
                      [0,1,8,9,14,15,16,17,22,23,48,49,56,57,62,63,6,7,13,55].includes(i)
                        ? 'bg-gold/80'
                        : i % 3 === 0 ? 'bg-ash/30' : 'bg-transparent'
                    }`}
                  />
                ))}
              </div>
              {/* Scan line */}
              <div className="absolute inset-x-2 top-2 bottom-2 overflow-hidden rounded-sm pointer-events-none">
                <div
                  className="absolute left-0 right-0 h-[2px] bg-gold/70"
                  style={{
                    boxShadow: '0 0 8px rgba(200,146,42,0.8)',
                    animation: 'scanDown 3s linear infinite',
                  }}
                />
              </div>
              {/* Verified */}
              <div
                className="absolute inset-0 flex items-center justify-center bg-bg/80 rounded-sm"
                style={{ animation: 'showVerified 3s linear infinite' }}
              >
                <div className="text-center">
                  <p className="text-green-400 text-3xl mb-1">✓</p>
                  <p className="font-mono text-xs text-green-400 tracking-widest">VERIFIED</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes scanDown {
          0% { top: 0; opacity: 1; }
          80% { top: calc(100% - 2px); opacity: 1; }
          90% { opacity: 0; }
          100% { top: calc(100% - 2px); opacity: 0; }
        }
        @keyframes showVerified {
          0%, 75% { opacity: 0; }
          82%, 94% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </section>
  )
}
