import { addDays, format, parseISO } from 'date-fns'
import { validIsoDate } from '@/features/demo/date-utils'

export const normalizeReference = (value: string) =>
  value.trim().toLocaleLowerCase('pl')

export const suggestedDeadline = (receivedAt: string) =>
  validIsoDate(receivedAt)
    ? format(addDays(parseISO(receivedAt), 14), 'yyyy-MM-dd')
    : ''
