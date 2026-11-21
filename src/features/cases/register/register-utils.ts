import { isValid, parseISO } from 'date-fns'
import { displayDate, urgency } from '@/features/demo/date-utils'
import type { CaseItem } from '@/features/demo/types'

const hasDate = (value: string) => Boolean(value) && isValid(parseISO(value))

export const getUrgency = (item: CaseItem) => {
  if (item.status === 'completed') return 'completed'
  if (!hasDate(item.deadline)) return 'unknown'
  return urgency(item)
}

export const formatDate = (value: string) =>
  hasDate(value) ? displayDate(value) : '—'

export const csvCell = (value: string) => {
  let first = 0
  while (
    first < value.length &&
    (value.charCodeAt(first) < 32 || /\s/.test(value[first]))
  )
    first += 1
  const safe =
    (first < value.length && '=+-@'.includes(value[first])) ||
    value.charCodeAt(0) < 32
      ? `'${value}`
      : value
  return `"${safe.replaceAll('"', '""')}"`
}
