import { apiClient } from '../client'
import {
  caseDetailSchema,
  caseListSchema,
  caseNumberCheckSchema,
  deadlinePreviewSchema,
  caseYearsSchema,
  requestAnalysisSchema,
  type CaseListParams,
  type CaseNumberCheckParams,
  type CaseSummary,
  type ChangeCaseStatusInput,
  type CreateCaseInput,
  type ExtendDeadlineInput,
  type UpdateCaseInput,
} from './cases.schemas'

const caseUrl = (id: string) => `/api/cases/${encodeURIComponent(id)}`

const toFormData = (fields: Record<string, string | File | undefined>) => {
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) form.append(key, value)
  })
  return form
}

export const analyzeRequest = async (file: File, signal?: AbortSignal) =>
  requestAnalysisSchema.parse(
    await apiClient.post<unknown, FormData>(
      '/api/cases/analyze',
      toFormData({ file }),
      { signal },
    ),
  )

export const getCases = async (
  { status, ...params }: CaseListParams,
  signal?: AbortSignal,
) =>
  caseListSchema.parse(
    await apiClient.get<unknown>('/api/cases', {
      params: { ...params, status: status?.join(',') || undefined },
      signal,
    }),
  )

const MAX_PAGE_SIZE = 500
const MAX_EXPORT_PAGES = 40

// Walks through every page (sequentially, bounded) for the CSV export.
export const getAllCases = async (
  params: Omit<CaseListParams, 'limit' | 'offset'>,
  signal?: AbortSignal,
) => {
  const items: CaseSummary[] = []
  for (let page = 0; page < MAX_EXPORT_PAGES; page += 1) {
    const result = await getCases(
      { ...params, limit: MAX_PAGE_SIZE, offset: items.length },
      signal,
    )
    items.push(...result.items)
    if (result.items.length === 0 || items.length >= result.total) return items
  }
  // Better to fail than to hand over a silently truncated export.
  throw new Error('Too many cases to export')
}

export const getCaseYears = async (signal?: AbortSignal) =>
  caseYearsSchema.parse(
    await apiClient.get<unknown>('/api/cases/years', { signal }),
  ).years

export const getDeadlinePreview = async (
  receivedAt: string,
  signal?: AbortSignal,
) =>
  deadlinePreviewSchema.parse(
    await apiClient.get<unknown>('/api/cases/deadline-preview', {
      params: { receivedAt },
      signal,
    }),
  )

export const checkCaseNumber = async (
  params: CaseNumberCheckParams,
  signal?: AbortSignal,
) =>
  caseNumberCheckSchema.parse(
    await apiClient.get<unknown>('/api/cases/case-number-check', {
      params,
      signal,
    }),
  )

export const getCase = async (id: string, signal?: AbortSignal) =>
  caseDetailSchema.parse(await apiClient.get<unknown>(caseUrl(id), { signal }))

// With a file the request goes as multipart, otherwise as plain JSON.
export const createCase = async ({ file, ...fields }: CreateCaseInput) =>
  caseDetailSchema.parse(
    await apiClient.post<unknown>(
      '/api/cases',
      file ? toFormData({ ...fields, file }) : fields,
    ),
  )

export const updateCase = async ({ id, ...fields }: UpdateCaseInput) =>
  caseDetailSchema.parse(await apiClient.patch<unknown>(caseUrl(id), fields))

export const changeCaseStatus = async ({
  id,
  ...body
}: ChangeCaseStatusInput) =>
  caseDetailSchema.parse(
    await apiClient.post<unknown>(`${caseUrl(id)}/status`, body),
  )

export const extendDeadline = async ({ id, ...body }: ExtendDeadlineInput) =>
  caseDetailSchema.parse(
    await apiClient.post<unknown>(`${caseUrl(id)}/extension`, body),
  )

export const cancelExtension = async (id: string) =>
  caseDetailSchema.parse(
    await apiClient.delete<unknown>(`${caseUrl(id)}/extension`),
  )
