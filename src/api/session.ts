import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { emailSchema, type AuthSession } from './auth/auth.schemas'

// TEMPORARY: the session is kept in localStorage so a reload does not require
// logging in again. Move the token to memory or an httpOnly cookie before
// handling real data.
export const SESSION_STORAGE_KEY = 'asystent-udip-session'

const storedSessionSchema = z.object({
  email: emailSchema,
  accessToken: z.string().min(1),
})

const writeStoredSession = (next: AuthSession | null) => {
  try {
    if (next) localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next))
    else localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // The session still works in memory.
  }
}

const readStoredSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw))
    if (parsed.success) return parsed.data
  } catch {
    // Unavailable or corrupted storage means a regular login.
  }
  writeStoredSession(null)
  return null
}

let session: AuthSession | null = readStoredSession()
const listeners = new Set<() => void>()

export const getSession = () => session

export const setSession = (next: AuthSession | null) => {
  if (next === session) return
  session = next
  writeStoredSession(next)
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
