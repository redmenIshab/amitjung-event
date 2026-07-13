'use client'

import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { BEATS, overlayOpacity } from './cameraPath'
import { ProgressContext } from './progressContext'
import { Scene } from './Scene'

import TicketingHero from '@/components/marketing/sections/ticketing/TicketingHero'
import ScannerStatus from '@/components/marketing/sections/ticketing/ScannerStatus'
import TicketingFeatures from '@/components/marketing/sections/ticketing/TicketingFeatures'
import TicketingProcess from '@/components/marketing/sections/ticketing/TicketingProcess'
import ClosingCta from '@/components/marketing/sections/ticketing/ClosingCta'

gsap.registerPlugin(ScrollTrigger)

const SCROLL_VH_PER_BEAT = 100

function FlatFallback() {
  return (
    <>
      <TicketingHero />
      <ScannerStatus />
      <TicketingFeatures />
      <TicketingProcess />
      <ClosingCta />
    </>
  )
}

class CanvasErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function supportsWebgl(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function JourneyExperience({ overlays }: { overlays: ReactNode[] }) {
  const [contextLost, setContextLost] = useState(false)
  const progressRef = useRef(0)
  const driverRef = useRef<HTMLDivElement>(null)
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (contextLost || !driverRef.current) return
    const applyOverlayStyles = (progress: number) => {
      overlayRefs.current.forEach((el, i) => {
        if (!el) return
        const o = overlayOpacity(i, progress)
        el.style.opacity = String(o)
        el.style.visibility = o === 0 ? 'hidden' : 'visible'
        el.style.transform = `translateY(${(1 - o) * 24}px)`
      })
    }
    const trigger = ScrollTrigger.create({
      trigger: driverRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => {
        progressRef.current = self.progress
        applyOverlayStyles(self.progress)
      },
    })
    // onUpdate does not fire at creation — apply the initial state so the
    // hero overlay is visible before any scrolling happens.
    progressRef.current = trigger.progress
    applyOverlayStyles(trigger.progress)
    return () => trigger.kill()
  }, [contextLost])

  if (contextLost) return <FlatFallback />

  return (
    <ProgressContext.Provider value={progressRef}>
      <div
        ref={driverRef}
        className="relative"
        style={{ height: `${BEATS.length * SCROLL_VH_PER_BEAT}vh` }}
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <Canvas
            dpr={[1, 2]}
            camera={{ fov: 55, near: 0.1, far: 120, position: [0, 26, 30] }}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener('webglcontextlost', () => setContextLost(true))
            }}
          >
            <Scene />
          </Canvas>
          {/* wrapper is pointer-events-none; interactive overlay content must set pointer-events-auto */}
          {overlays.map((overlay, i) => (
            <div
              key={BEATS[i]?.id ?? i}
              ref={(el) => {
                overlayRefs.current[i] = el
              }}
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
              style={{ opacity: 0, visibility: 'hidden' }}
            >
              {overlay}
            </div>
          ))}
        </div>
      </div>
    </ProgressContext.Provider>
  )
}

export default function EventJourney({ overlays = [] }: { overlays?: ReactNode[] }) {
  // false until the post-mount WebGL check passes: the server HTML and no-JS
  // users get the full flat marketing content; the 3D journey progressively
  // enhances after hydration.
  const [webgl, setWebgl] = useState(false)

  useEffect(() => {
    setWebgl(supportsWebgl())
  }, [])

  if (!webgl) return <FlatFallback />

  return (
    <CanvasErrorBoundary fallback={<FlatFallback />}>
      <JourneyExperience overlays={overlays} />
    </CanvasErrorBoundary>
  )
}
