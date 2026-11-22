import { createContext, useContext } from 'react'
import type { CaseOverlay } from './local-store-schema'
import type { CaseItem, UploadDraft } from '../types'

type LocalStore = {
  overlays: Record<string, CaseOverlay>
  uploadDraft: UploadDraft | null
  setUploadDraft: (draft: UploadDraft | null) => void
  updateCase: (id: string, changes: Partial<CaseItem>) => void
  storageError: 'restore' | 'save' | 'conflict' | null
}

export const LocalStoreContext = createContext<LocalStore | null>(null)

export const useLocalStore = () => {
  const store = useContext(LocalStoreContext)
  if (!store) throw new Error('LocalStoreProvider is required')
  return store
}
