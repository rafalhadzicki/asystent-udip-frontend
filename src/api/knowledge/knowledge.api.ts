import { apiClient } from '../client'
import {
  knowledgeDocumentDetailSchema,
  knowledgeDocumentSchema,
  knowledgeListSchema,
  type CreateKnowledgeInput,
  type KnowledgeListParams,
  type UpdateKnowledgeInput,
} from './knowledge.schemas'

const knowledgeUrl = (id: string) => `/api/knowledge/${encodeURIComponent(id)}`

export const getKnowledgeList = async (
  params: KnowledgeListParams,
  signal?: AbortSignal,
) =>
  knowledgeListSchema.parse(
    await apiClient.get<unknown>('/api/knowledge', { params, signal }),
  )

export const getKnowledgeDocument = async (id: string, signal?: AbortSignal) =>
  knowledgeDocumentDetailSchema.parse(
    await apiClient.get<unknown>(knowledgeUrl(id), { signal }),
  )

export const createKnowledgeDocument = async ({
  file,
  name,
  category,
}: CreateKnowledgeInput) => {
  const form = new FormData()
  form.append('file', file)
  form.append('name', name)
  form.append('category', category)
  return knowledgeDocumentSchema.parse(
    await apiClient.post<unknown>('/api/knowledge', form),
  )
}

export const updateKnowledgeDocument = async ({
  id,
  ...body
}: UpdateKnowledgeInput) =>
  knowledgeDocumentSchema.parse(
    await apiClient.patch<unknown>(knowledgeUrl(id), body),
  )

export const deleteKnowledgeDocument = async (id: string) => {
  await apiClient.delete(knowledgeUrl(id))
}

export const reindexKnowledgeDocument = async (id: string) =>
  knowledgeDocumentSchema.parse(
    await apiClient.post<unknown>(`${knowledgeUrl(id)}/reindex`),
  )
