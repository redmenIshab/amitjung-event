// Shared scrim + typography container for journey overlays.

export function OverlayShell({
  label,
  children,
  wide = false,
}: {
  label?: string
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div
      className={`mx-auto w-fit px-7 py-7 rounded-2xl ${wide ? 'max-w-5xl' : 'max-w-2xl'}`}
      style={{
        // Soft raised panel: a subtle top-lit gradient with a faint gold rim
        // and glow so text separates from the near-black venue behind it.
        background:
          'linear-gradient(160deg, rgba(38,32,20,0.72) 0%, rgba(18,17,15,0.68) 42%, rgba(10,9,8,0.62) 100%)',
        border: '1px solid rgba(200,146,42,0.18)',
        boxShadow:
          '0 24px 70px rgba(0,0,0,0.55), inset 0 1px 0 rgba(245,200,66,0.08)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      {label && <p className="section-label mb-4">{label}</p>}
      {children}
    </div>
  )
}
