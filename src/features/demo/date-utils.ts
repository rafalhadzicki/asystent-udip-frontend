import { format, isValid, parseISO } from 'date-fns'
import { pl } from 'date-fns/locale'

export const validIsoDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value))

export const displayDate = (value: string) =>
  value ? format(parseISO(value), 'dd.MM.yyyy', { locale: pl }) : '—'
