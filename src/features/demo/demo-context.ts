import { createContext, useContext } from 'react'
import type { CaseOverlay } from './demo-schema'
import type { CaseItem, KnowledgeItem, UploadDraft } from './types'

type DemoStore = {
  cases: CaseItem[]
  overlays: Record<string, CaseOverlay>
  knowledge: KnowledgeItem[]
  uploadDraft: UploadDraft | null
  setUploadDraft: (draft: UploadDraft | null) => void
  addCase: (item: CaseItem) => void
  updateCase: (id: string, changes: Partial<CaseItem>) => void
  addKnowledge: (item: KnowledgeItem) => void
  updateKnowledge: (id: string, changes: Partial<KnowledgeItem>) => void
  resetDemo: () => void
  storageError: 'restore' | 'save' | 'conflict' | null
}

export const DemoContext = createContext<DemoStore | null>(null)

export const useDemoStore = () => {
  const store = useContext(DemoContext)
  if (!store) throw new Error('DemoProvider is required')
  return store
}
