'use client'

import { WorkTile } from './WorkTile'
import type { Work } from './works'

export function MasonryGrid({
  works,
  onOpen,
}: {
  works: Work[]
  onOpen: (index: number) => void
}) {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 2xl:columns-4 gap-4">
      {works.map((work, i) => (
        <WorkTile key={work.id} work={work} index={i} onOpen={() => onOpen(i)} />
      ))}
    </div>
  )
}
