import { createContext, useContext } from 'react'
import type { CaseOverlay } from './demo-schema'
import type { CaseItem, UploadDraft } from './types'

type DemoStore = {
  overlays: Record<string, CaseOverlay>
  uploadDraft: UploadDraft | null
  setUploadDraft: (draft: UploadDraft | null) => void
  updateCase: (id: string, changes: Partial<CaseItem>) => void
  storageError: 'restore' | 'save' | 'conflict' | null
}

export const DemoContext = createContext<DemoStore | null>(null)

export const useDemoStore = () => {
  const store = useContext(DemoContext)
  if (!store) throw new Error('DemoProvider is required')
  return store
}
