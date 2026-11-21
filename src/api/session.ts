import { useSyncExternalStore } from 'react'
import type { AuthSession } from './auth/auth.schemas'

// The session lives only in memory: a page reload requires logging in again.
let session: AuthSession | null = null
const listeners = new Set<() => void>()

export const getSession = () => session

export const setSession = (next: AuthSession | null) => {
  if (next === session) return
  session = next
  listeners.forEach((listener) => listener())
}

export const clearSession = () => setSession(null)

export const subscribeToSession = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useSession = () =>
  useSyncExternalStore(subscribeToSession, getSession, getSession)

export const useSessionEmail = () => useSession()?.email ?? ''
