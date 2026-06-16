interface LogoProps {
  variant?: 'default' | 'white'
  height?: number
  className?: string
  showText?: boolean
}

export default function Logo({
  variant = 'default',
  height = 40,
  className = '',
  showText = false,
}: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Lyante Production"
        width={height}
        height={height}
        style={{ objectFit: 'contain' }}
      />
      {showText && (
        <span
          className="font-bebas leading-none"
          style={{
            fontSize: height * 0.6,
            color: variant === 'white' ? '#FFFFFF' : '#C8922A',
            letterSpacing: '0.14em',
          }}
        >
          LYANTE
        </span>
      )}
    </div>
  )
}
