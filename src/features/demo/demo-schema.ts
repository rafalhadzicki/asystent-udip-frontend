import { z } from 'zod'
import { validIsoDate } from './date-utils'

const isoDate = z.string().refine(validIsoDate)
const optionalIsoDate = z.union([z.literal(''), isoDate])

const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number(),
  unit: z.string(),
  addedAt: isoDate,
})

// Fields without a backend counterpart: kept in the browser for every case.
// Questions, departments and the date of the letter live on the server.
export const caseLocalSchema = z.object({
  status: z.enum(['analysis', 'waiting', 'draft', 'redaction', 'completed']),
  analysisNeedsReview: z.boolean().optional(),
  // The AI reason of a department; the API stores only the department itself.
  departmentReasons: z.record(z.string(), z.string()).optional(),
  materialNotes: z.string(),
  contactedAt: optionalIsoDate,
  responseText: z.string(),
  redactions: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      reason: z.string(),
      decision: z.enum(['hide', 'keep', 'pending']),
    }),
  ),
  redactionConfirmed: z.boolean(),
  sentAt: optionalIsoDate,
  sentNote: z.string(),
})

export const caseOverlaySchema = caseLocalSchema.partial()
export type CaseOverlay = z.infer<typeof caseOverlaySchema>

export const pickLocalFields = (changes: object): CaseOverlay =>
  Object.fromEntries(
    Object.entries(changes).filter(
      ([key, value]) => key in caseLocalSchema.shape && value !== undefined,
    ),
  )

const localCaseSchema = caseLocalSchema.extend({
  materials: z.array(documentSchema),
  writtenAt: optionalIsoDate,
  questions: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      selected: z.boolean(),
      departmentId: z.string().nullish(),
    }),
  ),
  departments: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      reason: z.string(),
      selected: z.boolean(),
    }),
  ),
  id: z.string(),
  reference: z.string(),
  subject: z.string(),
  applicant: z.string(),
  receivedAt: isoDate,
  deadline: isoDate,
  owner: z.string(),
  requestText: z.string(),
  source: documentSchema,
})

const knowledgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['law', 'response', 'guideline']),
  description: z.string(),
  updatedAt: isoDate,
  fileName: z.string(),
})

export const snapshotSchema = z.object({
  version: z.literal(1),
  cases: z.array(localCaseSchema),
  knowledge: z.array(knowledgeSchema),
  // Local data of cases that live on the server, keyed by case id.
  overlays: z.record(z.string(), caseOverlaySchema).default({}),
})

export type DemoSnapshot = z.infer<typeof snapshotSchema>
