import type {
  AiAnalysisStatus,
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

export type Question = {
  id: string
  text: string
  selected: boolean
  departmentId?: string | null
}
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
  departmentReasons?: Record<string, string>
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

// What the AI suggested for the case; saved on the server once the case exists.
export type DraftQuestion = { text: string; departmentId?: string }
export type DraftDepartment = { id: string; name: string; reason: string }

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
  applicantEmail: string
  applicantAddress: string
  questions: DraftQuestion[]
  departments: DraftDepartment[]
  aiStatus: AiAnalysisStatus
}

export type KnowledgeItem = {
  id: string
  name: string
  category: 'law' | 'response' | 'guideline'
  description: string
  updatedAt: string
  fileName: string
}
