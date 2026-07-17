'use client'

import { useEffect, useRef } from 'react'
import { site } from '@/data/site'

/** Animated waveform canvas — layered sine waves drifting like a live signal. */
function Waves() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let t = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth * devicePixelRatio
      canvas.height = canvas.offsetHeight * devicePixelRatio
      ctx.scale(devicePixelRatio, devicePixelRatio)
    }
    resize()
    window.addEventListener('resize', resize)

    const layers = [
      { amp: 42, freq: 0.006, speed: 0.012, color: 'rgba(220,47,63,0.35)', w: 1.6 },
      { amp: 30, freq: 0.009, speed: -0.008, color: 'rgba(212,169,78,0.22)', w: 1.2 },
      { amp: 58, freq: 0.004, speed: 0.006, color: 'rgba(242,237,228,0.10)', w: 1 },
      { amp: 20, freq: 0.013, speed: 0.018, color: 'rgba(220,47,63,0.16)', w: 1 },
    ]

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)
      const baseY = h * 0.62

      layers.forEach((L, li) => {
        ctx.beginPath()
        for (let x = 0; x <= w; x += 3) {
          const env = Math.sin((x / w) * Math.PI) // taper at edges
          const y =
            baseY +
            Math.sin(x * L.freq + t * L.speed * 60 + li * 2) *
              L.amp *
              env *
              (1 + 0.3 * Math.sin(t * 0.5 + li))
          if (x === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.strokeStyle = L.color
        ctx.lineWidth = L.w
        ctx.stroke()
      })

      t += 0.016
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />
}

export default function Hero() {
  return (
    <header className="hero" id="top">
      <div className="hero-glow" />
      <Waves />
      <div className="wrap hero-inner">
        <p className="hero-kicker">
          {site.tagline} · Managed by {site.management}
        </p>
        <h1>
          {site.artist.split(' ')[0]} <em>{site.artist.split(' ')[1]}</em>
        </h1>
        <p className="hero-deva devanagari">
          {site.album} — {site.albumYear}
        </p>
        <p className="hero-sub">
          Eight years of original Nepali music — songs about home, distance and
          return. Now writing the debut album. Available for live shows,
          festivals and private events.
        </p>
        <div className="hero-actions">
          <a href="#booking" className="btn btn-primary">
            Check availability
          </a>
          <a href="#music" className="btn btn-ghost">
            Listen first
          </a>
        </div>
      </div>
      <div className="hero-scroll">scroll</div>
    </header>
  )
}
