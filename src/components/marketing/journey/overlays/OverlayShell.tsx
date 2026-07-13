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
      className={`mx-auto px-6 py-10 rounded-2xl ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}
      style={{ backgroundColor: 'rgba(8,8,8,0.55)', backdropFilter: 'blur(6px)' }}
    >
      {label && <p className="section-label mb-4">{label}</p>}
      {children}
    </div>
  )
}
