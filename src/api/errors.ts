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
