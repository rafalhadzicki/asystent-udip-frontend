import { describe, expect, it } from 'vitest'
import i18n from './index'
import { mockLogin } from '../features/auth/mock-auth'

describe('i18n', () => {
  it('inicjalizuje polski słownik lokalnie i interpoluje dane', () => {
    expect(i18n.isInitialized).toBe(true)
    expect(i18n.resolvedLanguage).toBe('pl')
    expect(i18n.t('auth.submit')).toBe('Zaloguj się')
    expect(i18n.t('calendar.title')).toBe('Kalendarz terminów')
    expect(i18n.t('auth.demo.session', { name: 'Jan' })).toBe(
      'Sesja demonstracyjna · Jan',
    )
  })

  it('tłumaczy kod błędu mocka zamiast zwracać tekst z warstwy danych', async () => {
    const result = await mockLogin('demo', 'incorrect')
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('Expected mock login to fail')
    expect(result.code).toBe('invalidCredentials')
    expect(i18n.t(`auth.errors.${result.code}`)).toBe(
      'Nieprawidłowy login lub hasło.',
    )
  })
})
