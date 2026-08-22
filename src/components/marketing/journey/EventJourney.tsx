'use client'

import dynamic from 'next/dynamic'
import { Component, useEffect, useState, type ReactNode } from 'react'
import { FlatFallback } from './FlatFallback'

/**
 * Entry point for the ticketing journey.
 *
 * Deliberately free of three.js and gsap imports: the 3D experience is loaded
 * on demand once WebGL is confirmed, so the ~1 MB WebGL bundle never lands on
 * visitors who cannot use it (or before the check has run).
 */
const JourneyExperience = dynamic(() => import('./JourneyExperience'), {
  // The Canvas has no meaningful server rendering, and the flat page is the
  // honest placeholder while the bundle arrives.
  ssr: false,
  loading: () => <FlatFallback />,
})

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
