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

const suggestionSchema = <T extends z.ZodType<string>>(value: T) =>
  z.object({ value, source: z.enum(['FILE_NAME', 'TEXT']) }).nullish()

export const requestAnalysisSchema = z.object({
  fileName: z.string(),
  textExtractionStatus: textExtractionStatusSchema,
  extractedText: z.string().nullish(),
  suggestions: z.object({
    caseNumber: suggestionSchema(z.string()),
    receivedAt: suggestionSchema(isoDate),
    subject: suggestionSchema(z.string()),
  }),
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

export const caseYearsSchema = z.object({ years: z.array(z.number()) })

export const caseDetailSchema = caseSummarySchema.extend({
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
  documents: z.array(
    z.object({
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
    }),
  ),
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
