'use client'

import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BEATS, overlayOpacity } from './cameraPath'
import { ProgressContext } from './progressContext'
import { Scene } from './Scene'
import { FlatFallback } from './FlatFallback'

/**
 * The WebGL half of the ticketing journey.
 *
 * Split into its own module so three.js and gsap — about 1 MB of JavaScript —
 * are only downloaded once the WebGL check in EventJourney passes. Importing
 * them from the shared entry pulled that weight onto every visit to
 * /ticketing, including visitors who then fell back to the flat page.
 */

gsap.registerPlugin(ScrollTrigger)

const SCROLL_VH_PER_BEAT = 100

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

export default JourneyExperience
