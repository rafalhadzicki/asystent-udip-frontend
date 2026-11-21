import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import pl from './locales/pl.json'
import register from './locales/register.json'
import upload from './locales/upload.json'
import verification from './locales/verification.json'
import request from './locales/request.json'
import analysis from './locales/analysis.json'
import materials from './locales/materials.json'
import redaction from './locales/redaction.json'
import calendar from './locales/calendar.json'
import knowledge from './locales/knowledge.json'

export const resources = {
  pl: {
    translation: pl,
    register,
    upload,
    verification,
    request,
    analysis,
    materials,
    redaction,
    calendar,
    knowledge,
  },
}

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
