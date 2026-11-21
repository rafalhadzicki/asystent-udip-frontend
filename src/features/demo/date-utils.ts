import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'
import { DEMO_TODAY } from './demo-data'
import type { CaseItem } from './types'

export const validIsoDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value))

export const displayDate = (value: string) =>
  value ? format(parseISO(value), 'dd.MM.yyyy', { locale: pl }) : '—'
export const daysRemaining = (deadline: string) =>
  differenceInCalendarDays(parseISO(deadline), parseISO(DEMO_TODAY))
export const urgency = (item: CaseItem) => {
  if (item.status === 'completed') return 'completed'
  const days = daysRemaining(item.deadline)
  return days < 0
    ? 'overdue'
    : days === 0
      ? 'today'
      : days === 1
        ? 'tomorrow'
        : 'normal'
}
