'use client'

import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { beatLocalT } from '../cameraPath'
import { useProgress } from '../progressContext'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

const PANELS: {
  color: string
  position: [number, number, number]
  rotationY: number
}[] = [
  { color: '#0E1522', position: [-8, 6, -2], rotationY: Math.PI / 5 },
  { color: '#C8922A', position: [-4, 6.5, -6], rotationY: Math.PI / 10 },
  { color: '#E8E2D5', position: [0, 6, -3], rotationY: 0 },
  { color: '#B4443C', position: [4, 6.5, -6], rotationY: -Math.PI / 10 },
  { color: '#6B8F71', position: [8, 6, -2], rotationY: -Math.PI / 5 },
  { color: '#111111', position: [0, 7.5, 2], rotationY: Math.PI }, // typography panel
]

export function BrandPanels() {
  const progress = useProgress()
  const materials = useRef<(THREE.MeshStandardMaterial | null)[]>([])

  useFrame(() => {
    const boardT = beatLocalT(2, progress.current)
    for (let i = 0; i < PANELS.length; i++) {
      const mat = materials.current[i]
      if (!mat) continue
      // panels light up sequentially as the beat advances
      const lit = clamp01(boardT * PANELS.length - i * 0.7)
      mat.emissiveIntensity = 0.05 + lit * 0.9
    }
  })

  return (
    <group>
      {PANELS.map((panel, i) => (
        <group key={i} position={panel.position} rotation={[0, panel.rotationY, 0]}>
          {/* gold frame */}
          <mesh position={[0, 0, -0.03]}>
            <boxGeometry args={[3.4, 2.2, 0.05]} />
            <meshStandardMaterial color="#C8922A" emissive="#8B5E10" emissiveIntensity={0.4} />
          </mesh>
          {/* swatch face */}
          <mesh>
            <planeGeometry args={[3.2, 2]} />
            <meshStandardMaterial
              ref={(m) => {
                materials.current[i] = m
              }}
              color={panel.color}
              emissive={panel.color}
              emissiveIntensity={0.05}
              roughness={0.6}
            />
          </mesh>
          {/* gold rule on the typography panel */}
          {i === PANELS.length - 1 && (
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[2.4, 0.08]} />
              <meshStandardMaterial color="#C8922A" emissive="#C8922A" emissiveIntensity={1.2} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  )
}
