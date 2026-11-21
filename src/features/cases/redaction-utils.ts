import type { Redaction } from '@/features/demo/types'

export type TextRange = { start: number; end: number }

export const findExactOccurrences = (
  text: string,
  fragment: string,
): TextRange[] => {
  if (!fragment) return []

  const ranges: TextRange[] = []
  let fromIndex = 0
  while (fromIndex <= text.length - fragment.length) {
    const start = text.indexOf(fragment, fromIndex)
    if (start === -1) break
    ranges.push({ start, end: start + fragment.length })
    fromIndex = start + 1
  }
  return ranges
}

export const mergeRanges = (ranges: TextRange[]): TextRange[] => {
  const sorted = [...ranges].sort(
    (left, right) => left.start - right.start || left.end - right.end,
  )
  const merged: TextRange[] = []

  for (const range of sorted) {
    const previous = merged.at(-1)
    if (!previous || range.start > previous.end) {
      merged.push({ ...range })
    } else {
      previous.end = Math.max(previous.end, range.end)
    }
  }

  return merged
}

export const redactText = (
  text: string,
  redactions: Redaction[],
  replacement = '[ZANONIMIZOWANO]',
): string => {
  const ranges = mergeRanges(
    redactions
      .filter((redaction) => redaction.decision === 'hide')
      .flatMap((redaction) => findExactOccurrences(text, redaction.text)),
  )
  if (ranges.length === 0) return text

  let result = ''
  let cursor = 0
  for (const range of ranges) {
    result += text.slice(cursor, range.start) + replacement
    cursor = range.end
  }
  return result + text.slice(cursor)
}

export const hasUnresolvedRedactions = (redactions: Redaction[]): boolean =>
  redactions.some((redaction) => redaction.decision === 'pending')

export const canExportRedactedText = (
  confirmed: boolean,
  redactions: Redaction[],
): boolean => confirmed && !hasUnresolvedRedactions(redactions)

export const overlapsExistingRedaction = (
  text: string,
  fragment: string,
  redactions: Redaction[],
): boolean => {
  const candidateRanges = findExactOccurrences(text, fragment)
  const existingRanges = redactions.flatMap((redaction) =>
    findExactOccurrences(text, redaction.text),
  )
  return candidateRanges.some((candidate) =>
    existingRanges.some(
      (existing) =>
        candidate.start < existing.end && existing.start < candidate.end,
    ),
  )
}
