import Link from 'next/link'

/** Shared input/label/button classes so every auth form looks identical. */
export const authInput =
  'w-full rounded-md bg-lyante-surface border border-coal/40 px-3.5 py-2.5 text-sm text-ivory placeholder:text-coal focus:outline-none focus:border-gold transition-colors'
export const authLabel =
  'block text-[11px] font-medium uppercase tracking-widest text-ash mb-1.5'
export const authButton =
  'w-full rounded-md bg-gold text-lyante-bg text-sm font-bold uppercase tracking-wide py-2.5 hover:bg-gold-light transition-colors disabled:opacity-50 disabled:hover:bg-gold cursor-pointer'

type Props = {
  eyebrow?: string
  title: string
  subtitle?: string
  /** Editorial copy for the desktop brand panel. */
  panelHeadline?: React.ReactNode
  panelSubcopy?: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export function AuthShell({
  eyebrow,
  title,
  subtitle,
  panelHeadline,
  panelSubcopy,
  children,
  footer,
}: Props) {
  return (
    <main className="relative min-h-screen w-full flex bg-lyante-bg text-ivory font-dm-sans overflow-hidden">
      {/* Ambient Lyante glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute -top-[15%] -left-[10%] w-[55vw] h-[55vw] rounded-full blur-[150px] opacity-[0.10]"
          style={{ background: 'radial-gradient(circle, #c8922a, transparent 60%)' }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[45vw] h-[45vw] rounded-full blur-[160px] opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #8b5e10, transparent 60%)' }}
        />
      </div>

      {/* ══ Left — editorial brand panel (desktop) ══ */}
      <aside className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 xl:p-16 border-r border-coal/25">
        <Link
          href="/"
          className="font-bebas text-2xl tracking-[0.35em] text-gold hover:text-gold-light transition-colors w-fit"
          aria-label="Lyante Production home"
        >
          LYANTE
        </Link>

        <div>
          <p className="section-label tracking-widest text-gold mb-5">Live · Curated · Unforgettable</p>
          <h2 className="font-bebas text-[68px] xl:text-[84px] leading-[0.85] text-ivory uppercase tracking-tight">
            {panelHeadline ?? (
              <>
                The night
                <br />
                begins here.
              </>
            )}
          </h2>
          <p className="text-ash mt-7 max-w-sm leading-relaxed">
            {panelSubcopy ??
              'Secure your tickets, track your bookings, and step into experiences crafted by Lyante Production.'}
          </p>
        </div>

        <p className="text-coal text-xs tracking-wide">
          © {new Date().getFullYear()} Lyante Production
        </p>
      </aside>

      {/* ══ Right — form panel ══ */}
      <section className="flex-1 flex items-center justify-center px-6 py-12 md:px-10">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="lg:hidden inline-block font-bebas text-xl tracking-[0.35em] text-gold mb-10"
            aria-label="Lyante Production home"
          >
            LYANTE
          </Link>

          {eyebrow && <p className="section-label tracking-widest text-gold mb-2">{eyebrow}</p>}
          <h1 className="font-bebas text-[42px] leading-none text-ivory uppercase tracking-tight mb-2">
            {title}
          </h1>
          {subtitle && <p className="text-ash text-sm mb-8">{subtitle}</p>}

          {children}

          {footer && <div className="mt-7 text-center text-sm text-ash">{footer}</div>}
        </div>
      </section>
    </main>
  )
}
