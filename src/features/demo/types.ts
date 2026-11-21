import type {
  AnalysisWarning,
  CaseStatus as ApiCaseStatus,
  TextExtractionStatus,
} from '@/api/cases/cases.schemas'

export type CaseStatus =
  'analysis' | 'waiting' | 'draft' | 'redaction' | 'completed'

export type DocumentMeta = {
  id: string
  name: string
  size: number
  unit: string
  addedAt: string
}

export type Question = { id: string; text: string; selected: boolean }
export type Department = {
  id: string
  name: string
  reason: string
  selected: boolean
}
export type RedactionDecision = 'hide' | 'keep' | 'pending'
export type Redaction = {
  id: string
  text: string
  reason: string
  decision: RedactionDecision
}

export type CaseItem = {
  id: string
  reference: string
  subject: string
  applicant: string
  receivedAt: string
  writtenAt: string
  deadline: string
  owner: string
  status: CaseStatus
  requestText: string
  source: DocumentMeta
  questions: Question[]
  // Only on cases composed from the API; never stored locally.
  apiStatus?: ApiCaseStatus
  analysisNeedsReview?: boolean
  departments: Department[]
  materials: DocumentMeta[]
  materialNotes: string
  contactedAt: string
  responseText: string
  redactions: Redaction[]
  redactionConfirmed: boolean
  sentAt: string
  sentNote: string
}

export type UploadDraft = {
  file: File
  reference?: string
  warnings?: AnalysisWarning[]
  textExtractionStatus?: TextExtractionStatus
  requestText: string
  subject: string
  applicant: string
  receivedAt: string
  writtenAt: string
}

export type KnowledgeItem = {
  id: string
  name: string
  category: 'law' | 'response' | 'guideline'
  description: string
  updatedAt: string
  fileName: string
}
