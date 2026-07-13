'use client'

import { createContext, useContext, type RefObject } from 'react'

export const ProgressContext = createContext<RefObject<number> | null>(null)

export function useProgress(): RefObject<number> {
  const ref = useContext(ProgressContext)
  if (!ref) throw new Error('useProgress must be used inside EventJourney')
  return ref
}
