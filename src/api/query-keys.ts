import type {
  KnowledgeListParams,
  KnowledgeSearchParams,
} from './knowledge/knowledge.schemas'
import type {
  CaseListParams,
  CaseNumberCheckParams,
} from './cases/cases.schemas'

// Every key starts with the signed-in user so cached data never leaks between accounts.
const userScope = (email: string) => ['user', email] as const

export const queryKeys = {
  departments: {
    all: (email: string) => [...userScope(email), 'departments'] as const,
  },
  knowledge: {
    all: (email: string) => [...userScope(email), 'knowledge'] as const,
    list: (email: string, params: KnowledgeListParams) =>
      [...queryKeys.knowledge.all(email), 'list', params] as const,
    detail: (email: string, id: string) =>
      [...queryKeys.knowledge.all(email), 'detail', id] as const,
    search: (email: string, params: KnowledgeSearchParams) =>
      [...queryKeys.knowledge.all(email), 'search', params] as const,
  },
  cases: {
    all: (email: string) => [...userScope(email), 'cases'] as const,
    lists: (email: string) => [...queryKeys.cases.all(email), 'list'] as const,
    list: (email: string, params: CaseListParams) =>
      [...queryKeys.cases.lists(email), params] as const,
    years: (email: string) => [...queryKeys.cases.all(email), 'years'] as const,
    deadlinePreview: (email: string, receivedAt: string) =>
      [...queryKeys.cases.all(email), 'deadline-preview', receivedAt] as const,
    numberCheck: (email: string, params: CaseNumberCheckParams) =>
      [...queryKeys.cases.all(email), 'number-check', params] as const,
    details: (email: string) =>
      [...queryKeys.cases.all(email), 'detail'] as const,
    detail: (email: string, id: string) =>
      [...queryKeys.cases.details(email), id] as const,
  },
}
