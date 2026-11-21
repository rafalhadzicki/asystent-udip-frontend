import { describe, expect, it } from 'vitest'
import type { Redaction } from '@/features/demo/types'
import {
  canExportRedactedText,
  findCaseInsensitiveOccurrences,
  findExactOccurrences,
  hasUnresolvedRedactions,
  overlapsExistingRedaction,
  redactText,
} from './redaction-utils'

const redaction = (
  text: string,
  decision: Redaction['decision'] = 'hide',
): Redaction => ({ id: text, text, reason: 'test', decision })

describe('redaction utilities', () => {
  it('finds every repeated exact occurrence', () => {
    expect(findExactOccurrences('Jan i Jan', 'Jan')).toEqual([
      { start: 0, end: 3 },
      { start: 6, end: 9 },
    ])
  })

  it('finds case variants with Polish characters and original text offsets', () => {
    const text = '😀 Żaneta ŻÓŁĆ, żANETA żółć, Żanecie Żółci'
    const matches = findCaseInsensitiveOccurrences(text, 'Żaneta Żółć')
    expect(matches.map(({ start, end }) => text.slice(start, end))).toEqual([
      'Żaneta ŻÓŁĆ',
      'żANETA żółć',
    ])
    expect(matches[0].start).toBe(3)
  })

  it('treats metacharacters literally and finds overlapping occurrences', () => {
    expect(findCaseInsensitiveOccurrences('a.a A.A', 'A.A')).toEqual([
      { start: 0, end: 3 },
      { start: 4, end: 7 },
    ])
    expect(findCaseInsensitiveOccurrences('aAa', 'AA')).toEqual([
      { start: 0, end: 2 },
      { start: 1, end: 3 },
    ])
    expect(findCaseInsensitiveOccurrences('anything', '')).toEqual([])
  })

  it('keeps decisions exact so saved choices do not affect other variants', () => {
    expect(redactText('Jan JAN Jan', [redaction('Jan')])).toBe(
      '[ZANONIMIZOWANO] JAN [ZANONIMIZOWANO]',
    )
  })

  it('merges overlapping selected text ranges before replacement', () => {
    expect(
      redactText('abcdef abcdef', [
        redaction('abc'),
        redaction('bcde'),
        redaction('ef'),
      ]),
    ).toBe('[ZANONIMIZOWANO] [ZANONIMIZOWANO]')
  })

  it('leaves kept and pending text unchanged', () => {
    expect(
      redactText('Jan i Jan', [
        redaction('Jan', 'keep'),
        redaction('i', 'pending'),
      ]),
    ).toBe('Jan i Jan')
  })

  it('requires confirmation and resolved decisions before export', () => {
    expect(canExportRedactedText(false, [])).toBe(false)
    expect(canExportRedactedText(true, [redaction('Jan', 'pending')])).toBe(
      false,
    )
    expect(canExportRedactedText(true, [])).toBe(true)
    expect(hasUnresolvedRedactions([redaction('Jan', 'pending')])).toBe(true)
  })

  it('detects selections that would overlap existing fragments', () => {
    expect(overlapsExistingRedaction('abcdef', 'cde', [redaction('abc')])).toBe(
      true,
    )
    expect(overlapsExistingRedaction('abcdef', 'def', [redaction('abc')])).toBe(
      false,
    )
  })
})
