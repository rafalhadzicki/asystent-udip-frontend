import { z } from 'zod'
import { textExtractionStatusSchema } from '../cases/cases.schemas'

export const knowledgeCategorySchema = z.enum(['LAW', 'RESPONSE', 'GUIDELINE'])
export const knowledgeIndexStatusSchema = z.enum([
  'PENDING',
  'INDEXED',
  'NO_TEXT',
  'FAILED',
])

export const knowledgeDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: knowledgeCategorySchema,
  description: z.string().nullish(),
  originalName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  textExtractionStatus: textExtractionStatusSchema,
  indexStatus: knowledgeIndexStatusSchema,
  chunkCount: z.number(),
  uploadedBy: z.object({ id: z.string(), email: z.string() }),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const knowledgeDocumentDetailSchema = knowledgeDocumentSchema.extend({
  extractedText: z.string().nullish(),
})

export const knowledgeListSchema = z.object({
  items: z.array(knowledgeDocumentSchema),
  total: z.number(),
})

export type KnowledgeCategory = z.infer<typeof knowledgeCategorySchema>
export type KnowledgeIndexStatus = z.infer<typeof knowledgeIndexStatusSchema>
export type KnowledgeDocument = z.infer<typeof knowledgeDocumentSchema>
export type KnowledgeDocumentDetail = z.infer<
  typeof knowledgeDocumentDetailSchema
>
export type KnowledgeList = z.infer<typeof knowledgeListSchema>

export type KnowledgeListParams = {
  q?: string
  category?: KnowledgeCategory
  limit: number
  offset: number
}
export type CreateKnowledgeInput = {
  file: File
  name: string
  category: KnowledgeCategory
}
export type UpdateKnowledgeInput = {
  id: string
  name: string
  category: KnowledgeCategory
}
