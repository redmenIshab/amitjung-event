'use client'

import { createContext, useContext, type MutableRefObject } from 'react'

export const ProgressContext = createContext<MutableRefObject<number> | null>(null)

export function useProgress(): MutableRefObject<number> {
  const ref = useContext(ProgressContext)
  if (!ref) throw new Error('useProgress must be used inside EventJourney')
  return ref
}
