import { getApiErrorKind } from '@/api/errors'
import type { Question } from '@/features/demo/types'

export type SubmitError = 'tooLarge' | 'unsupported' | 'invalid' | 'failed'

export const toSubmitError = (error: unknown): SubmitError => {
  const kind = getApiErrorKind(error)
  return kind === 'tooLarge' || kind === 'unsupported' || kind === 'invalid'
    ? kind
    : 'failed'
}

export const isFutureDate = (isoDate: string, today = new Date()) =>
  isoDate > today.toISOString().slice(0, 10)

// Splits the request text into one preliminary question per line or sentence.
export const splitQuestions = (text: string): Question[] =>
  text
    .split(/\n+|(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({ id: crypto.randomUUID(), text: part, selected: false }))
