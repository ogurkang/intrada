'use client'

import { createContext, useContext, type ReactNode } from 'react'

const TanimlarSaltOkunurContext = createContext(false)

export function TanimlarSaltOkunurProvider({
  value,
  children,
}: {
  value: boolean
  children: ReactNode
}) {
  return <TanimlarSaltOkunurContext.Provider value={value}>{children}</TanimlarSaltOkunurContext.Provider>
}

/** Tanımlar altında: kullanıcı rolü için true (yalnızca görüntüleme). */
export function useTanimlarSaltOkunur() {
  return useContext(TanimlarSaltOkunurContext)
}
