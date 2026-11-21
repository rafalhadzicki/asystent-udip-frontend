import type { CaseListParams } from './cases/cases.schemas'

// Every key starts with the signed-in user so cached data never leaks between accounts.
const userScope = (email: string) => ['user', email] as const

export const queryKeys = {
  departments: {
    all: (email: string) => [...userScope(email), 'departments'] as const,
  },
  cases: {
    all: (email: string) => [...userScope(email), 'cases'] as const,
    lists: (email: string) => [...queryKeys.cases.all(email), 'list'] as const,
    list: (email: string, params: CaseListParams) =>
      [...queryKeys.cases.lists(email), params] as const,
    years: (email: string) => [...queryKeys.cases.all(email), 'years'] as const,
    details: (email: string) =>
      [...queryKeys.cases.all(email), 'detail'] as const,
    detail: (email: string, id: string) =>
      [...queryKeys.cases.details(email), id] as const,
  },
}
