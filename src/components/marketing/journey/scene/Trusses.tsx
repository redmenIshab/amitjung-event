'use client'

const BAR = { color: '#1c1c1c', roughness: 0.5, metalness: 0.8 }

function TrussBar({
  position,
  size,
}: {
  position: [number, number, number]
  size: [number, number, number]
}) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial {...BAR} />
    </mesh>
  )
}

export function Trusses() {
  return (
    <group position={[0, 10, -8]}>
      {/* two long horizontal trusses over the stage */}
      <TrussBar position={[0, 0, 0]} size={[20, 0.3, 0.3]} />
      <TrussBar position={[0, 0, 4]} size={[20, 0.3, 0.3]} />
      {/* cross braces */}
      {[-8, -4, 0, 4, 8].map((x) => (
        <TrussBar key={x} position={[x, 0, 2]} size={[0.25, 0.25, 4]} />
      ))}
      {/* vertical supports down to the stage */}
      {[-9.5, 9.5].map((x) => (
        <TrussBar key={x} position={[x, -4.5, 2]} size={[0.3, 9, 0.3]} />
      ))}
    </group>
  )
}
