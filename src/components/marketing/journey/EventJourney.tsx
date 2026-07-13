'use client'

import { Canvas } from '@react-three/fiber'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { BEATS, overlayOpacity } from './cameraPath'
import { ProgressContext } from './progressContext'
import { Scene } from './Scene'

import BrandingHero from '@/components/marketing/sections/branding/BrandingHero'
import CoreServices from '@/components/marketing/sections/branding/CoreServices'
import BrandBoard from '@/components/marketing/sections/branding/BrandBoard'
import BrandingDeliverables from '@/components/marketing/sections/branding/BrandingDeliverables'
import BrandBuildPhases from '@/components/marketing/sections/branding/BrandBuildPhases'
import ClosingCta from '@/components/marketing/sections/branding/ClosingCta'

gsap.registerPlugin(ScrollTrigger)

const SCROLL_VH_PER_BEAT = 100

function FlatFallback() {
  return (
    <>
      <BrandingHero />
      <CoreServices />
      <BrandBoard />
      <BrandingDeliverables />
      <BrandBuildPhases />
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

export default function EventJourney({ overlays = [] }: { overlays?: ReactNode[] }) {
  // null = not yet checked (SSR/first paint), then true/false after mount.
  const [webgl, setWebgl] = useState<boolean | null>(null)
  const progressRef = useRef(0)
  const driverRef = useRef<HTMLDivElement>(null)
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    setWebgl(supportsWebgl())
  }, [])

  useEffect(() => {
    if (!webgl || !driverRef.current) return
    const trigger = ScrollTrigger.create({
      trigger: driverRef.current,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => {
        progressRef.current = self.progress
        overlayRefs.current.forEach((el, i) => {
          if (!el) return
          const o = overlayOpacity(i, self.progress)
          el.style.opacity = String(o)
          el.style.visibility = o === 0 ? 'hidden' : 'visible'
          el.style.transform = `translateY(${(1 - o) * 24}px)`
        })
      },
    })
    return () => trigger.kill()
  }, [webgl])

  if (webgl === null) {
    return <div style={{ height: '100vh', backgroundColor: '#080808' }} />
  }
  if (!webgl) return <FlatFallback />

  return (
    <ProgressContext.Provider value={progressRef}>
      <div ref={driverRef} style={{ height: `${BEATS.length * SCROLL_VH_PER_BEAT}vh` }}>
        <div className="fixed inset-0">
          <CanvasErrorBoundary fallback={<FlatFallback />}>
            <Canvas
              dpr={[1, 2]}
              camera={{ fov: 55, near: 0.1, far: 120, position: [0, 26, 30] }}
              gl={{ antialias: true, powerPreference: 'high-performance' }}
            >
              <Scene />
            </Canvas>
          </CanvasErrorBoundary>
        </div>
        {overlays.map((overlay, i) => (
          <div
            key={BEATS[i]?.id ?? i}
            ref={(el) => {
              overlayRefs.current[i] = el
            }}
            className="fixed inset-0 pointer-events-none flex items-center justify-center"
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            {overlay}
          </div>
        ))}
      </div>
    </ProgressContext.Provider>
  )
}
