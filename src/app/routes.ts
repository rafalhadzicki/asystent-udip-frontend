export const caseTabs = {
  request: 'wniosek',
  analysis: 'analiza',
  materials: 'materialy',
  redaction: 'anonimizacja',
} as const

const cases = '/sprawy'

export const routes = {
  home: '/',
  login: '/login',
  cases,
  upload: `${cases}/nowy`,
  verification: `${cases}/nowy/weryfikacja`,
  casePattern: `${cases}/:caseId`,
  calendar: '/kalendarz',
  knowledge: '/baza-wiedzy',
  caseTab: (id: string, tab: (typeof caseTabs)[keyof typeof caseTabs]) =>
    `${cases}/${encodeURIComponent(id)}/${tab}`,
} as const
