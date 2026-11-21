import 'i18next'
import type pl from './locales/pl.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    strictKeyChecks: true
    resources: { translation: typeof pl }
  }
}
