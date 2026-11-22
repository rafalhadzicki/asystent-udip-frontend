import type { Redaction, RedactionDecision } from '@/features/cases/types'

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

export type TextSegment = { text: string; decision?: RedactionDecision }

// Splits the text into plain parts and parts matched by a redaction, so the
// preview can colour them. With `applyHidden` the hidden parts show the
// replacement, as in the exported text.
export const segmentText = (
  text: string,
  redactions: Redaction[],
  { applyHidden, replacement }: { applyHidden: boolean; replacement: string },
): TextSegment[] => {
  const matches = redactions
    .flatMap((redaction) =>
      findExactOccurrences(text, redaction.text).map((range) => ({
        ...range,
        decision: redaction.decision,
      })),
    )
    .sort((left, right) => left.start - right.start || right.end - left.end)

  const segments: TextSegment[] = []
  let cursor = 0
  for (const match of matches) {
    if (match.start < cursor) continue
    if (match.start > cursor) {
      segments.push({ text: text.slice(cursor, match.start) })
    }
    segments.push({
      text:
        applyHidden && match.decision === 'hide'
          ? replacement
          : text.slice(match.start, match.end),
      decision: match.decision,
    })
    cursor = match.end
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}
