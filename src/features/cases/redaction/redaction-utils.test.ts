import { describe, expect, it } from 'vitest'
import type { Redaction } from '@/features/demo/types'
import {
  canExportRedactedText,
  findExactOccurrences,
  hasUnresolvedRedactions,
  overlapsExistingRedaction,
  redactText,
  segmentText,
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

describe('segmentText', () => {
  const redactions: Redaction[] = [
    { id: '1', text: 'Jan', reason: '', decision: 'hide' },
    { id: '2', text: 'Poznań', reason: '', decision: 'keep' },
    { id: '3', text: 'PESEL', reason: '', decision: 'pending' },
  ]
  const text = 'Jan z Poznań, PESEL'

  it('marks every fragment in the original text', () => {
    expect(
      segmentText(text, redactions, { applyHidden: false, replacement: 'X' }),
    ).toEqual([
      { text: 'Jan', decision: 'hide' },
      { text: ' z ' },
      { text: 'Poznań', decision: 'keep' },
      { text: ', ' },
      { text: 'PESEL', decision: 'pending' },
    ])
  })

  it('replaces hidden fragments and still marks kept ones', () => {
    expect(
      segmentText(text, redactions, { applyHidden: true, replacement: 'X' }),
    ).toEqual([
      { text: 'X', decision: 'hide' },
      { text: ' z ' },
      { text: 'Poznań', decision: 'keep' },
      { text: ', ' },
      { text: 'PESEL', decision: 'pending' },
    ])
  })
})
