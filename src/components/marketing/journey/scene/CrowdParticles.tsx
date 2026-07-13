'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { beatLocalT } from '../cameraPath'
import { useProgress } from '../progressContext'

const COUNT = 2000
const dummy = new THREE.Object3D()
const color = new THREE.Color()
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function CrowdParticles() {
  const progress = useProgress()
  const meshRef = useRef<THREE.InstancedMesh>(null)

  // Deterministic pseudo-random layout (seeded by index) in the crowd area.
  const seeds = useMemo(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      const r1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
      const r2 = Math.abs(Math.sin(i * 78.233) * 12578.1459) % 1
      const r3 = Math.abs(Math.sin(i * 3.7) * 2751.3) % 1
      return {
        x: (r1 - 0.5) * 34,
        z: r2 * 22,
        y: 1.4 + r3 * 0.5,
        phase: r1 * Math.PI * 2,
        // wave 0..3 by depth row: nearest-to-stage quarter is wave 0
        wave: Math.min(3, Math.floor(r2 * 4)),
      }
    })
  }, [])

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh) return
    const t = clock.getElapsedTime()
    const phasesT = beatLocalT(4, progress.current)

    for (let i = 0; i < COUNT; i++) {
      const s = seeds[i]
      dummy.position.set(s.x, s.y + Math.sin(t * 1.4 + s.phase) * 0.12, s.z)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      // brighten wave-by-wave during buildPhases
      const lit = clamp01(phasesT * 4 - s.wave)
      const brightness = 0.35 + lit * 0.65
      color.set('#F5C842').multiplyScalar(brightness)
      mesh.setColorAt(i, color)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]}>
      <sphereGeometry args={[0.07, 6, 6]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fog={false}
      />
    </instancedMesh>
  )
}
