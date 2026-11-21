import { apiClient } from '../client'
import { departmentListSchema } from './departments.schemas'

export const getDepartments = async (signal?: AbortSignal) =>
  departmentListSchema.parse(
    await apiClient.get<unknown>('/api/departments', { signal }),
  )
