'use client'

export function Stage() {
  return (
    <group position={[0, 0, -8]}>
      {/* platform */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[18, 1, 8]} />
        <meshStandardMaterial color="#141414" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* gold edge strip */}
      <mesh position={[0, 1.02, 4.01]}>
        <boxGeometry args={[18, 0.06, 0.06]} />
        <meshStandardMaterial color="#C8922A" emissive="#C8922A" emissiveIntensity={2} />
      </mesh>
      {/* backdrop */}
      <mesh position={[0, 5, -4]}>
        <boxGeometry args={[18, 9, 0.3]} />
        <meshStandardMaterial color="#0d0d0d" roughness={0.9} />
      </mesh>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 12]}>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.85} metalness={0.2} />
      </mesh>
    </group>
  )
}
