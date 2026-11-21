import axios from 'axios'
import { getErrorStatus } from './client'

export type ApiErrorKind =
  | 'unauthorized'
  | 'invalid'
  | 'conflict'
  | 'tooLarge'
  | 'unsupported'
  | 'unknown'

// The single place that translates HTTP statuses into what the UI cares about.
export const getApiErrorKind = (error: unknown): ApiErrorKind => {
  switch (getErrorStatus(error)) {
    case 400:
      return 'invalid'
    case 401:
      return 'unauthorized'
    case 409:
      return 'conflict'
    case 413:
      return 'tooLarge'
    case 415:
      return 'unsupported'
    default:
      return 'unknown'
  }
}

// Machine-readable `code` of an error body, e.g. CASE_NUMBER_TAKEN on a 409.
export const getApiErrorCode = (error: unknown): string | undefined => {
  if (!axios.isAxiosError(error)) return undefined
  const data: unknown = error.response?.data
  if (typeof data !== 'object' || data === null || !('code' in data))
    return undefined
  return typeof data.code === 'string' ? data.code : undefined
}
