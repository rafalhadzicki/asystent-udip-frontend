import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createDemoCases } from './demo-data'
import type { CaseItem, UploadDraft } from './types'
import {
  pickLocalFields,
  snapshotSchema,
  type DemoSnapshot,
} from './demo-schema'
import { DemoContext } from './demo-context'
import { useSessionEmail } from '@/api/session'

export const DEMO_STORAGE_KEY = 'asystent-udip-demo-v1'

// Local data belongs to the signed-in user; without a session the base key is used.
const storageKeyFor = (email: string) =>
  email ? `${DEMO_STORAGE_KEY}:${email.trim().toLowerCase()}` : DEMO_STORAGE_KEY

const freshSnapshot = (): DemoSnapshot => ({
  version: 1,
  cases: createDemoCases(),
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
    cases: cases.filter((item) => !isCopy(item)),
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

const DemoStateProvider = ({
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

  const saveSnapshot = (next: DemoSnapshot) => {
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

  const updateCase = (id: string, changes: Partial<CaseItem>) => {
    const current = currentSnapshot.current
    if (!current.cases.some((item) => item.id === id)) {
      // A case that is not stored locally lives on the server: only its local fields are kept.
      saveSnapshot({
        ...current,
        overlays: {
          ...current.overlays,
          [id]: { ...current.overlays[id], ...pickLocalFields(changes) },
        },
      })
      return
    }
    saveSnapshot({
      ...current,
      cases: current.cases.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    })
  }

  return (
    <DemoContext.Provider
      value={{
        cases: snapshot.cases,
        overlays: snapshot.overlays,
        uploadDraft,
        setUploadDraft,
        storageError,
        addCase: (item) => {
          if (currentSnapshot.current.cases.some(({ id }) => id === item.id))
            return
          saveSnapshot({
            ...currentSnapshot.current,
            cases: [...currentSnapshot.current.cases, item],
          })
        },
        updateCase,
        resetDemo: () => {
          saveSnapshot(freshSnapshot())
          setUploadDraft(null)
        },
      }}
    >
      {children}
    </DemoContext.Provider>
  )
}

// Remounting on a session change swaps the stored data and drops the upload draft.
export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const email = useSessionEmail()
  return (
    <DemoStateProvider key={email} storageKey={storageKeyFor(email)}>
      {children}
    </DemoStateProvider>
  )
}
