'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { beatLocalT } from '../cameraPath'
import { useProgress } from '../progressContext'

const BEAM_XS = [-8, -4.8, -1.6, 1.6, 4.8, 8]
const BEAM_HEIGHT = 9
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function SpotBeams() {
  const progress = useProgress()
  const materials = useRef<(THREE.MeshBasicMaterial | null)[]>([])

  useFrame(() => {
    const p = progress.current
    const servicesT = beatLocalT(1, p)
    const deliverablesT = beatLocalT(3, p)
    const ctaT = beatLocalT(5, p)

    for (let i = 0; i < BEAM_XS.length; i++) {
      const mat = materials.current[i]
      if (!mat) continue
      // core services: beam i ignites when the sweep passes its slot
      const ignite = clamp01(servicesT * BEAM_XS.length - i)
      let intensity = 0.28 * ignite
      // deliverables: first 4 beams pulse up sequentially
      if (i < 4) {
        const pool = clamp01(deliverablesT * 4 - i)
        intensity = Math.max(intensity, 0.45 * pool)
      }
      // cta: dim everything except the center pair
      if (ctaT > 0 && i !== 2 && i !== 3) {
        intensity *= 1 - ctaT
      }
      mat.opacity = intensity
    }
  })

  return (
    <group position={[0, 10, -6]}>
      {BEAM_XS.map((x, i) => (
        <mesh key={x} position={[x, -BEAM_HEIGHT / 2, 0]}>
          <coneGeometry args={[2.2, BEAM_HEIGHT, 24, 1, true]} />
          <meshBasicMaterial
            ref={(m) => {
              materials.current[i] = m
            }}
            color="#F5C842"
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  )
}
