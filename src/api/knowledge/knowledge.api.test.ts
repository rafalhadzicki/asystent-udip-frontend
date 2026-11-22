import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { apiClient } from '../client'
import {
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  getKnowledgeList,
  reindexKnowledgeDocument,
  updateKnowledgeDocument,
} from './knowledge.api'

const document = {
  id: 'doc-1',
  name: 'Ustawa',
  category: 'LAW',
  description: null,
  originalName: 'ustawa.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 10,
  textExtractionStatus: 'EXTRACTED',
  indexStatus: 'INDEXED',
  chunkCount: 2,
  uploadedBy: { id: 'u', email: 'u@example.test' },
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
}

afterEach(() => vi.restoreAllMocks())

describe('knowledge api', () => {
  it('lists documents with the filters as query params', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ items: [document], total: 1 })
    const params = {
      q: 'ustawa',
      category: 'LAW' as const,
      limit: 5,
      offset: 0,
    }
    expect((await getKnowledgeList(params)).total).toBe(1)
    expect(get).toHaveBeenCalledWith('/api/knowledge', {
      params,
      signal: undefined,
    })
  })

  it('rejects a category outside the contract', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      items: [{ ...document, category: 'law' }],
      total: 1,
    })
    await expect(
      getKnowledgeList({ limit: 5, offset: 0 }),
    ).rejects.toBeInstanceOf(ZodError)
  })

  it('uploads the file as multipart form data', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(document)
    const file = new File(['x'], 'ustawa.pdf')
    await createKnowledgeDocument({ file, name: 'Ustawa', category: 'LAW' })
    const [url, form] = post.mock.calls[0]
    expect(url).toBe('/api/knowledge')
    expect(form).toBeInstanceOf(FormData)
    expect((form as FormData).get('name')).toBe('Ustawa')
    expect((form as FormData).get('category')).toBe('LAW')
    expect((form as FormData).get('file')).toBeInstanceOf(File)
  })

  it('patches, reindexes and deletes by id', async () => {
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue(document)
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(document)
    const remove = vi.spyOn(apiClient, 'delete').mockResolvedValue(undefined)
    await updateKnowledgeDocument({
      id: 'doc-1',
      name: 'N',
      category: 'RESPONSE',
    })
    expect(patch).toHaveBeenCalledWith('/api/knowledge/doc-1', {
      name: 'N',
      category: 'RESPONSE',
    })
    await reindexKnowledgeDocument('doc-1')
    expect(post).toHaveBeenCalledWith('/api/knowledge/doc-1/reindex')
    await deleteKnowledgeDocument('doc-1')
    expect(remove).toHaveBeenCalledWith('/api/knowledge/doc-1')
  })
})
