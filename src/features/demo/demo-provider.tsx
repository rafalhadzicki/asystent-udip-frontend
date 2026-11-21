import { useRef, useState, type ReactNode } from 'react'
import { createDemoCases, createDemoKnowledge } from './demo-data'
import type { CaseItem, KnowledgeItem, UploadDraft } from './types'
import { validIsoDate } from './date-utils'
import { DemoContext } from './demo-context'

export const DEMO_STORAGE_KEY = 'asystent-udip-demo-v1'

type DemoSnapshot = {
  version: 1
  cases: CaseItem[]
  knowledge: KnowledgeItem[]
}
const freshSnapshot = (): DemoSnapshot => ({
  version: 1,
  cases: createDemoCases(),
  knowledge: createDemoKnowledge(),
})

const readSnapshot = () => {
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY)
    if (!raw) return { snapshot: freshSnapshot(), error: null }
    const parsed: unknown = JSON.parse(raw)
    if (!isSnapshot(parsed)) throw new Error('Invalid demo data')
    return { snapshot: parsed, error: null }
  } catch (error) {
    console.error('Cannot restore demo data', error)
    return { snapshot: freshSnapshot(), error: 'restore' }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isSnapshot = (value: unknown): value is DemoSnapshot => {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.cases) ||
    !Array.isArray(value.knowledge)
  )
    return false
  const strings = [
    'id',
    'reference',
    'subject',
    'applicant',
    'receivedAt',
    'writtenAt',
    'deadline',
    'owner',
    'requestText',
    'materialNotes',
    'contactedAt',
    'responseText',
    'sentAt',
    'sentNote',
  ]
  const documentValid = (doc: unknown) =>
    isRecord(doc) &&
    ['id', 'name', 'unit', 'addedAt'].every(
      (key) => typeof doc[key] === 'string',
    ) &&
    typeof doc.addedAt === 'string' &&
    validIsoDate(doc.addedAt) &&
    typeof doc.size === 'number'
  return (
    value.cases.every(
      (item) =>
        isRecord(item) &&
        strings.every((key) => typeof item[key] === 'string') &&
        ['receivedAt', 'deadline'].every(
          (key) => typeof item[key] === 'string' && validIsoDate(item[key]),
        ) &&
        ['writtenAt', 'contactedAt', 'sentAt'].every(
          (key) =>
            item[key] === '' ||
            (typeof item[key] === 'string' && validIsoDate(item[key])),
        ) &&
        ['analysis', 'waiting', 'draft', 'redaction', 'completed'].includes(
          String(item.status),
        ) &&
        documentValid(item.source) &&
        Array.isArray(item.materials) &&
        item.materials.every(documentValid) &&
        Array.isArray(item.questions) &&
        item.questions.every(
          (q) =>
            isRecord(q) &&
            typeof q.id === 'string' &&
            typeof q.text === 'string' &&
            typeof q.selected === 'boolean',
        ) &&
        Array.isArray(item.departments) &&
        item.departments.every(
          (d) =>
            isRecord(d) &&
            typeof d.id === 'string' &&
            typeof d.name === 'string' &&
            typeof d.reason === 'string' &&
            typeof d.selected === 'boolean',
        ) &&
        Array.isArray(item.redactions) &&
        item.redactions.every(
          (r) =>
            isRecord(r) &&
            typeof r.id === 'string' &&
            typeof r.text === 'string' &&
            typeof r.reason === 'string' &&
            ['hide', 'keep', 'pending'].includes(String(r.decision)),
        ) &&
        typeof item.redactionConfirmed === 'boolean',
    ) &&
    value.knowledge.every(
      (item) =>
        isRecord(item) &&
        ['id', 'name', 'description', 'updatedAt', 'fileName'].every(
          (key) => typeof item[key] === 'string',
        ) &&
        typeof item.updatedAt === 'string' &&
        validIsoDate(item.updatedAt) &&
        ['law', 'response', 'guideline'].includes(String(item.category)),
    )
  )
}

export const DemoProvider = ({ children }: { children: ReactNode }) => {
  const [initial] = useState(readSnapshot)
  const [snapshot, setSnapshot] = useState(initial.snapshot)
  const currentSnapshot = useRef(initial.snapshot)
  const [storageError, setStorageError] = useState<string | null>(initial.error)
  const [uploadDraft, setUploadDraft] = useState<UploadDraft | null>(null)

  const saveSnapshot = (next: DemoSnapshot) => {
    currentSnapshot.current = next
    setSnapshot(next)
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next))
      setStorageError(null)
    } catch (error) {
      console.error('Cannot persist demo data', error)
      setStorageError('save')
    }
  }

  const updateCase = (id: string, changes: Partial<CaseItem>) => {
    const current = currentSnapshot.current
    if (!current.cases.some((item) => item.id === id))
      throw new Error(`Unknown case: ${id}`)
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
        knowledge: snapshot.knowledge,
        uploadDraft,
        setUploadDraft,
        storageError,
        addCase: (item) =>
          saveSnapshot({
            ...currentSnapshot.current,
            cases: [...currentSnapshot.current.cases, item],
          }),
        updateCase,
        addKnowledge: (item) =>
          saveSnapshot({
            ...currentSnapshot.current,
            knowledge: [...currentSnapshot.current.knowledge, item],
          }),
        updateKnowledge: (id, changes) =>
          saveSnapshot({
            ...currentSnapshot.current,
            knowledge: currentSnapshot.current.knowledge.map((item) =>
              item.id === id ? { ...item, ...changes } : item,
            ),
          }),
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
