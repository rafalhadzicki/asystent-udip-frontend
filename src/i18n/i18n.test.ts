import { describe, expect, it } from 'vitest'
import i18n from './index'

describe('i18n', () => {
  it('inicjalizuje polski słownik lokalnie i interpoluje dane', () => {
    expect(i18n.isInitialized).toBe(true)
    expect(i18n.resolvedLanguage).toBe('pl')
    expect(i18n.t('auth.submit')).toBe('Zaloguj się')
    expect(i18n.t('calendar.title')).toBe('Kalendarz terminów')
    expect(i18n.t('auth.session', { email: 'jan@example.com' })).toBe(
      'Zalogowano · jan@example.com',
    )
  })
})
