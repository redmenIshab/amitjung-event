'use client'

import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { beatLocalT } from '../cameraPath'
import { useProgress } from '../progressContext'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

type Ticket = {
  name: string
  date: string
  tier: string
  code: string
  position: [number, number, number]
  rotationY: number
}

const TICKETS: Ticket[] = [
  { name: 'NIGHT ROAR', date: 'FRI · 20 DEC', tier: 'GA', code: 'LY-8F2A', position: [-7.5, 6, -2], rotationY: Math.PI / 6 },
  { name: 'BASS RIOT', date: 'SAT · 04 JAN', tier: 'VIP', code: 'LY-2C71', position: [-2.6, 6.6, -6], rotationY: Math.PI / 12 },
  { name: 'ECHO FEST', date: 'SUN · 19 JAN', tier: 'GA', code: 'LY-9AB0', position: [2.6, 6.6, -6], rotationY: -Math.PI / 12 },
  { name: 'GOLDEN HOUR', date: 'SAT · 01 FEB', tier: 'VIP', code: 'LY-5D3E', position: [7.5, 6, -2], rotationY: -Math.PI / 6 },
]

const GOLD = '#C8922A'
const GOLD_LIGHT = '#F5C842'
const INK = '#0d0d0d'
const IVORY = '#F0EDE6'

/** Deterministic pseudo-QR fill for a given seed. Visual only, not scannable. */
function qrFilled(row: number, col: number, seed: number): boolean {
  const finder = (r: number, c: number, n: number) =>
    (r < 5 && c < 5) || (r < 5 && c >= n - 5) || (r >= n - 5 && c < 5)
  const N = 15
  if (finder(row, col, N)) {
    const lr = row < 5 ? row : row - (N - 5)
    const lc = col < 5 ? col : col - (N - 5)
    return lr === 0 || lr === 4 || lc === 0 || lc === 4 || (lr === 2 && lc === 2)
  }
  return Math.abs(Math.sin((row * 41.3 + col * 17.7 + seed * 7.1) * 12.9898) * 43758.5453) % 1 > 0.5
}

/** Draw a ticket-card face (event details + pseudo-QR) to a CanvasTexture. */
function makeTicketTexture(ticket: Ticket, seed: number): THREE.CanvasTexture {
  const W = 512
  const H = 720
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = INK
  ctx.fillRect(0, 0, W, H)

  // gold header band
  ctx.fillStyle = GOLD
  ctx.fillRect(0, 0, W, 12)

  // label
  ctx.fillStyle = GOLD_LIGHT
  ctx.font = '600 26px monospace'
  ctx.fillText('LYANTE · ADMIT ONE', 40, 78)

  // event name
  ctx.fillStyle = IVORY
  ctx.font = '700 72px Georgia, serif'
  ctx.fillText(ticket.name, 40, 170)

  // date + tier
  ctx.fillStyle = '#9A9590'
  ctx.font = '400 34px monospace'
  ctx.fillText(ticket.date, 40, 232)
  ctx.fillStyle = GOLD
  ctx.font = '700 34px monospace'
  ctx.fillText(ticket.tier, 40, 282)

  // perforation line
  ctx.strokeStyle = 'rgba(154,149,144,0.5)'
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(40, 330)
  ctx.lineTo(W - 40, 330)
  ctx.stroke()
  ctx.setLineDash([])

  // pseudo-QR block
  const N = 15
  const qr = 300
  const cell = qr / N
  const qx = (W - qr) / 2
  const qy = 380
  ctx.fillStyle = IVORY
  ctx.fillRect(qx - 12, qy - 12, qr + 24, qr + 24)
  ctx.fillStyle = INK
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (qrFilled(r, c, seed)) ctx.fillRect(qx + c * cell, qy + r * cell, cell + 0.5, cell + 0.5)
    }
  }

  // code
  ctx.fillStyle = GOLD_LIGHT
  ctx.font = '600 28px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`#${ticket.code}`, W / 2, qy + qr + 60)
  ctx.textAlign = 'left'

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function TicketPanels() {
  const progress = useProgress()
  const materials = useRef<(THREE.MeshStandardMaterial | null)[]>([])

  const textures = useMemo(() => TICKETS.map((t, i) => makeTicketTexture(t, i + 1)), [])

  useFrame(() => {
    const t = beatLocalT(2, progress.current)
    for (let i = 0; i < TICKETS.length; i++) {
      const mat = materials.current[i]
      if (!mat) continue
      // tickets light up one after another as the beat advances
      const lit = clamp01(t * TICKETS.length - i * 0.7)
      mat.emissiveIntensity = 0.15 + lit * 1.05
    }
  })

  return (
    <group>
      {TICKETS.map((ticket, i) => (
        <group key={ticket.code} position={ticket.position} rotation={[0, ticket.rotationY, 0]}>
          {/* gold frame */}
          <mesh position={[0, 0, -0.04]}>
            <boxGeometry args={[2.5, 3.55, 0.06]} />
            <meshStandardMaterial color={GOLD} emissive="#8B5E10" emissiveIntensity={0.5} metalness={0.6} roughness={0.4} />
          </mesh>
          {/* ticket face */}
          <mesh>
            <planeGeometry args={[2.32, 3.37]} />
            <meshStandardMaterial
              ref={(m) => {
                materials.current[i] = m
              }}
              map={textures[i]}
              emissiveMap={textures[i]}
              emissive={IVORY}
              emissiveIntensity={0.15}
              toneMapped={false}
              roughness={0.7}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
