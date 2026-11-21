import type { KnowledgeItem } from '@/features/demo/types'

export const CATEGORIES: readonly KnowledgeItem['category'][] = [
  'law',
  'response',
  'guideline',
]
export const MAX_KNOWLEDGE_FILE_BYTES = 25 * 1024 * 1024
