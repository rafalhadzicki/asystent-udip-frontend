import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import pl from './locales/pl.json'

export const resources = { pl: { translation: pl } }

void i18n.use(initReactI18next).init({
  resources,
  lng: 'pl',
  supportedLngs: ['pl'],
  fallbackLng: 'pl',
  defaultNS: 'translation',
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
})

export default i18n
