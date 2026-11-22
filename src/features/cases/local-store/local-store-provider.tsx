import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { CaseItem, UploadDraft } from '../types'
import {
  pickLocalFields,
  snapshotSchema,
  type LocalSnapshot,
} from './local-store-schema'
import { LocalStoreContext } from './local-store-context'
import { useSessionEmail } from '@/api/session'

export const LOCAL_STORAGE_KEY = 'asystent-udip-demo-v1'

// Local data belongs to the signed-in user; without a session the base key is used.
const storageKeyFor = (email: string) =>
  email
    ? `${LOCAL_STORAGE_KEY}:${email.trim().toLowerCase()}`
    : LOCAL_STORAGE_KEY

const freshSnapshot = (): LocalSnapshot => ({
  version: 1,
  overlays: {},
})

// Earlier versions stored copies of API cases among the local cases (marked with
// apiStatus). Keep their local fields as overlays so the server data wins again.
const migrateApiCopies = (value: unknown) => {
  if (typeof value !== 'object' || value === null) return value
  const { cases, overlays, ...rest } = value as Record<string, unknown>
  if (!Array.isArray(cases)) return value
  const isCopy = (item: unknown): item is Record<string, unknown> =>
    typeof item === 'object' && item !== null && 'apiStatus' in item
  const migrated = Object.fromEntries(
    cases
      .filter(isCopy)
      .map((item) => [String(item.id), pickLocalFields(item)]),
  )
  return {
    ...rest,
    overlays: {
      ...migrated,
      ...(typeof overlays === 'object' ? overlays : {}),
    },
  }
}

const readSnapshot = (storageKey: string) => {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(storageKey)
    if (!raw) return { snapshot: freshSnapshot(), error: null, raw }
    return {
      snapshot: snapshotSchema.parse(migrateApiCopies(JSON.parse(raw))),
      error: null,
      raw,
    }
  } catch (error) {
    console.error('Cannot restore demo data', error)
    return { snapshot: freshSnapshot(), error: 'restore' as const, raw }
  }
}

const LocalStateProvider = ({
  storageKey,
  children,
}: {
  storageKey: string
  children: ReactNode
}) => {
  const [initial] = useState(() => readSnapshot(storageKey))
  const [snapshot, setSnapshot] = useState(initial.snapshot)
  const currentSnapshot = useRef(initial.snapshot)
  const persistedRaw = useRef(initial.raw)
  const conflict = useRef(false)
  const [storageError, setStorageError] = useState<
    'restore' | 'save' | 'conflict' | null
  >(initial.error)
  const [uploadDraft, setUploadDraft] = useState<UploadDraft | null>(null)

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (
        event.storageArea === localStorage &&
        (event.key === storageKey || event.key === null) &&
        (event.key === null || event.newValue !== persistedRaw.current)
      ) {
        conflict.current = true
        setStorageError('conflict')
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [storageKey])

  const saveSnapshot = (next: LocalSnapshot) => {
    currentSnapshot.current = next
    setSnapshot(next)
    try {
      if (
        conflict.current ||
        localStorage.getItem(storageKey) !== persistedRaw.current
      ) {
        conflict.current = true
        setStorageError('conflict')
        return
      }
      const raw = JSON.stringify(next)
      localStorage.setItem(storageKey, raw)
      persistedRaw.current = raw
      setStorageError(null)
    } catch (error) {
      console.error('Cannot persist demo data', error)
      setStorageError('save')
    }
  }

  // Cases live on the server: only their local fields are kept here.
  const updateCase = (id: string, changes: Partial<CaseItem>) => {
    const current = currentSnapshot.current
    saveSnapshot({
      ...current,
      overlays: {
        ...current.overlays,
        [id]: { ...current.overlays[id], ...pickLocalFields(changes) },
      },
    })
  }

  return (
    <LocalStoreContext.Provider
      value={{
        overlays: snapshot.overlays,
        uploadDraft,
        setUploadDraft,
        storageError,
        updateCase,
      }}
    >
      {children}
    </LocalStoreContext.Provider>
  )
}

// Remounting on a session change swaps the stored data and drops the upload draft.
export const LocalStoreProvider = ({ children }: { children: ReactNode }) => {
  const email = useSessionEmail()
  return (
    <LocalStateProvider key={email} storageKey={storageKeyFor(email)}>
      {children}
    </LocalStateProvider>
  )
}
