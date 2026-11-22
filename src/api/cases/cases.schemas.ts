import { z } from 'zod'
import { departmentSchema } from '../departments/departments.schemas'

const isoDate = z.iso.date()

export const caseStatusSchema = z.enum([
  'NEW',
  'SENT_TO_DEPARTMENTS',
  'RESPONSE_PREPARED',
  'RESPONSE_SENT',
])
export const UNFINISHED_STATUSES = [
  'NEW',
  'SENT_TO_DEPARTMENTS',
  'RESPONSE_PREPARED',
] as const satisfies readonly z.infer<typeof caseStatusSchema>[]
export const caseUrgencySchema = z.enum([
  'DONE',
  'OVERDUE',
  'DUE_TODAY',
  'DUE_TOMORROW',
  'UPCOMING',
])
export const caseSortSchema = z.enum([
  'RECEIVED_ASC',
  'RECEIVED_DESC',
  'DEADLINE_ASC',
])
export const textExtractionStatusSchema = z.enum([
  'EXTRACTED',
  'NO_TEXT',
  'UNSUPPORTED',
  'FAILED',
])
export const analysisWarningSchema = z.enum([
  'TEXT_NOT_FOUND',
  'TEXT_EXTRACTION_UNSUPPORTED',
  'TEXT_EXTRACTION_FAILED',
  'RECEIVED_AT_IN_FUTURE_IGNORED',
  'CASE_NUMBER_TAKEN',
])
export const caseDocumentKindSchema = z.enum([
  'REQUEST',
  'DEPARTMENT_RESPONSE',
  'DRAFT_RESPONSE',
  'OTHER',
])

const userRefSchema = z.object({ id: z.string(), email: z.string() })

export const extractionMethodSchema = z.enum(['AI', 'PATTERN'])
export const aiAnalysisStatusSchema = z.enum([
  'USED',
  'NOT_CONFIGURED',
  'FAILED',
  'SKIPPED_NO_TEXT',
])

const suggestionSchema = <T extends z.ZodType<string>>(value: T) =>
  z
    .object({
      value,
      source: z.enum(['FILE_NAME', 'TEXT']),
      method: extractionMethodSchema,
    })
    .nullish()

const suggestedQuestionSchema = z.object({
  text: z.string(),
  departmentIds: z.array(z.string()),
})

const suggestedDepartmentSchema = z.object({
  departmentId: z.string(),
  symbol: z.string(),
  name: z.string(),
  reason: z.string(),
})

export const caseQuestionSchema = z.object({
  id: z.string(),
  position: z.number(),
  text: z.string(),
  departmentId: z.string().nullish(),
})

export const caseDocumentSchema = z.object({
  id: z.string(),
  kind: caseDocumentKindSchema,
  department: z
    .object({ id: z.string(), symbol: z.string(), name: z.string() })
    .nullish(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  textExtractionStatus: textExtractionStatusSchema,
  uploadedBy: userRefSchema,
  createdAt: z.string(),
})

export const draftResponseSchema = z.object({
  text: z.string(),
  sources: z.array(
    z.object({
      kind: z.enum(['CASE_DOCUMENT', 'KNOWLEDGE']),
      documentId: z.string(),
      documentName: z.string(),
      category: z.enum(['LAW', 'RESPONSE', 'GUIDELINE']).nullish(),
      departmentSymbol: z.string().nullish(),
      excerpt: z.string(),
    }),
  ),
})

export const redactionCategorySchema = z.enum([
  'PERSON_NAME',
  'ADDRESS',
  'EMAIL',
  'PHONE',
  'ID_NUMBER',
  'OTHER',
])

export const redactionSuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      text: z.string(),
      category: redactionCategorySchema,
      reason: z.string(),
    }),
  ),
})

export const requestAnalysisSchema = z.object({
  fileName: z.string(),
  textExtractionStatus: textExtractionStatusSchema,
  extractedText: z.string().nullish(),
  suggestions: z.object({
    caseNumber: suggestionSchema(z.string()),
    receivedAt: suggestionSchema(isoDate),
    subject: suggestionSchema(z.string()),
    writtenAt: suggestionSchema(isoDate),
    requesterName: suggestionSchema(z.string()),
    requesterEmail: suggestionSchema(z.string()),
    requesterAddress: suggestionSchema(z.string()),
  }),
  questions: z.array(suggestedQuestionSchema),
  departments: z.array(suggestedDepartmentSchema),
  ai: z.object({ status: aiAnalysisStatusSchema }),
  warnings: z.array(analysisWarningSchema),
})

export const caseSummarySchema = z.object({
  id: z.string(),
  year: z.number(),
  sequenceNumber: z.number(),
  caseNumber: z.string(),
  subject: z.string(),
  status: caseStatusSchema,
  receivedAt: isoDate,
  dueAt: isoDate,
  extendedDueAt: isoDate.nullish(),
  isExtended: z.boolean(),
  effectiveDueAt: isoDate,
  daysLeft: z.number(),
  urgency: caseUrgencySchema,
  respondedAt: isoDate.nullish(),
  handlerInitials: z.string().nullish(),
  assignee: userRefSchema.nullish(),
  departments: z.array(z.object({ symbol: z.string(), answered: z.boolean() })),
})

export const caseListSchema = z.object({
  items: z.array(caseSummarySchema),
  total: z.number(),
})

export const caseCalendarSchema = z.object({
  from: isoDate,
  to: isoDate,
  items: z.array(caseSummarySchema),
})

export const caseYearsSchema = z.object({ years: z.array(z.number()) })

export const caseNumberConflictSchema = z.enum([
  'CASE_NUMBER_TAKEN',
  'SEQUENCE_NUMBER_TAKEN',
])

export const deadlinePreviewSchema = z.object({
  receivedAt: isoDate,
  dueAt: isoDate,
  maxExtendedDueAt: isoDate,
})

export const caseNumberCheckSchema = z.object({
  caseNumber: z.string(),
  available: z.boolean(),
  conflict: caseNumberConflictSchema.nullish(),
})

export const caseDetailSchema = caseSummarySchema.extend({
  writtenAt: isoDate.nullish(),
  requestText: z.string().nullish(),
  extensionReason: z.string().nullish(),
  requesterName: z.string().nullish(),
  requesterEmail: z.string().nullish(),
  requesterAddress: z.string().nullish(),
  notes: z.string().nullish(),
  createdBy: userRefSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  departmentRequests: z.array(
    z.object({
      department: departmentSchema,
      requestedAt: isoDate,
      answeredAt: isoDate.nullish(),
    }),
  ),
  questions: z.array(caseQuestionSchema),
  documents: z.array(caseDocumentSchema),
  statusHistory: z.array(
    z.object({
      fromStatus: caseStatusSchema.nullish(),
      toStatus: caseStatusSchema,
      comment: z.string().nullish(),
      changedBy: userRefSchema,
      createdAt: z.string(),
    }),
  ),
  allowedStatuses: z.array(caseStatusSchema),
  maxExtendedDueAt: isoDate,
})

export type CaseStatus = z.infer<typeof caseStatusSchema>
export type CaseUrgency = z.infer<typeof caseUrgencySchema>
export type CaseSort = z.infer<typeof caseSortSchema>
export type TextExtractionStatus = z.infer<typeof textExtractionStatusSchema>
export type AnalysisWarning = z.infer<typeof analysisWarningSchema>
export type RequestAnalysis = z.infer<typeof requestAnalysisSchema>
export type CaseSummary = z.infer<typeof caseSummarySchema>
export type CaseList = z.infer<typeof caseListSchema>
export type CaseDetail = z.infer<typeof caseDetailSchema>
export type AiAnalysisStatus = z.infer<typeof aiAnalysisStatusSchema>
export type CaseQuestion = z.infer<typeof caseQuestionSchema>
export type CaseDocument = z.infer<typeof caseDocumentSchema>
export type CaseDocumentKind = z.infer<typeof caseDocumentKindSchema>
export type DraftResponse = z.infer<typeof draftResponseSchema>
export type RedactionSuggestion = z.infer<
  typeof redactionSuggestionsSchema
>['suggestions'][number]
export type CaseNumberConflict = z.infer<typeof caseNumberConflictSchema>
export type DeadlinePreview = z.infer<typeof deadlinePreviewSchema>
export type CaseNumberCheck = z.infer<typeof caseNumberCheckSchema>

export type CaseNumberCheckParams = {
  caseNumber: string
  year?: number
  exceptId?: string
}

export type CaseCalendarParams = { from: string; to: string }

export type CaseListParams = {
  year?: number
  status?: readonly CaseStatus[]
  extended?: boolean
  assigneeId?: string
  q?: string
  sort?: CaseSort
  limit?: number
  offset?: number
}

export type CaseFields = {
  subject: string
  receivedAt: string
  writtenAt?: string
  requestText?: string
  caseNumber?: string
  handlerInitials?: string
  assigneeId?: string
  requesterName?: string
  requesterEmail?: string
  requesterAddress?: string
  notes?: string
}

export type CreateCaseInput = CaseFields & { file?: File }
export type UpdateCaseInput = { id: string } & Partial<CaseFields>
export type ChangeCaseStatusInput = {
  id: string
  status: CaseStatus
  comment?: string
  respondedAt?: string
}
export type ExtendDeadlineInput = {
  id: string
  extendedDueAt: string
  reason: string
}

export type SetCaseQuestionsInput = {
  id: string
  questions: { text: string; departmentId?: string | null }[]
}
export type SetCaseDepartmentsInput = { id: string; departmentIds: string[] }
export type UploadCaseDocumentInput = {
  caseId: string
  file: File
  kind: CaseDocumentKind
  departmentId?: string
}
export type DeleteCaseDocumentInput = { caseId: string; documentId: string }
export type DraftResponseInput = {
  id: string
  questionIds?: string[]
  notes?: string
}
export type RedactionSuggestionsInput = { id: string; text: string }
