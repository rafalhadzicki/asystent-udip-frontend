import { apiClient } from '../client'
import {
  caseDetailSchema,
  caseListSchema,
  caseYearsSchema,
  requestAnalysisSchema,
  type CaseListParams,
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

export const getCaseYears = async (signal?: AbortSignal) =>
  caseYearsSchema.parse(
    await apiClient.get<unknown>('/api/cases/years', { signal }),
  ).years

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
