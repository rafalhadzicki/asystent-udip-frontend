import { isValid, parseISO } from 'date-fns'
import type { CaseSummary, CaseUrgency } from '@/api/cases/cases.schemas'
import { displayDate } from '@/features/demo/date-utils'

export const urgencyTones = {
  DONE: 'completed',
  OVERDUE: 'overdue',
  DUE_TODAY: 'today',
  DUE_TOMORROW: 'tomorrow',
  UPCOMING: 'normal',
} as const satisfies Record<CaseUrgency, string>

export const formatDate = (value?: string | null) =>
  value && isValid(parseISO(value)) ? displayDate(value) : '—'

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

export const caseOwner = (item: CaseSummary) =>
  item.assignee?.email ?? item.handlerInitials ?? '—'
