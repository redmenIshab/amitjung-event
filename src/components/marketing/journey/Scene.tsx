'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { getCameraState } from './cameraPath'
import { useProgress } from './progressContext'
import { Stage } from './scene/Stage'
import { Trusses } from './scene/Trusses'
import { SpotBeams } from './scene/SpotBeams'
import { CrowdParticles } from './scene/CrowdParticles'
import { TicketPanels } from './scene/TicketPanels'

function CameraRig() {
  const progress = useProgress()
  const { camera } = useThree()
  const lookAtTarget = useRef(new THREE.Vector3())

  useFrame(() => {
    const { position, lookAt } = getCameraState(progress.current)
    camera.position.set(position[0], position[1], position[2])
    lookAtTarget.current.set(lookAt[0], lookAt[1], lookAt[2])
    camera.lookAt(lookAtTarget.current)
  })

  return null
}

export function Scene() {
  return (
    <>
      <color attach="background" args={['#080808']} />
      <fog attach="fog" args={['#080808', 12, 55]} />
      <ambientLight intensity={0.15} />
      <CameraRig />
      <Stage />
      <Trusses />
      <SpotBeams />
      <CrowdParticles />
      <TicketPanels />
    </>
  )
}
