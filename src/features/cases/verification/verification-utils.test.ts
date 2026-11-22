import { describe, expect, it } from 'vitest'
import {
  isFutureDate,
  splitQuestions,
  toSubmitError,
} from './verification-utils'

describe('verification utils', () => {
  it('splits text by lines and sentences and drops blanks', () => {
    const questions = splitQuestions('Pierwsze pytanie. Drugie?\n\n  Trzecie  ')
    expect(questions).toEqual(['Pierwsze pytanie.', 'Drugie?', 'Trzecie'])
  })

  it('returns no questions for empty text', () => {
    expect(splitQuestions('  \n ')).toEqual([])
  })

  it('detects dates after today only', () => {
    const today = new Date('2026-11-22T10:00:00Z')
    expect(isFutureDate('2026-11-23', today)).toBe(true)
    expect(isFutureDate('2026-11-22', today)).toBe(false)
    expect(isFutureDate('2026-11-21', today)).toBe(false)
  })

  it('falls back to a generic submit error', () => {
    expect(toSubmitError(new Error('offline'))).toBe('failed')
  })
})
