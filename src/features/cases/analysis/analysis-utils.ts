import type { KnowledgeMatch } from '@/api/knowledge/knowledge.schemas'
import type { Department, Question } from '@/features/cases/types'

export const selectedQuestions = (questions: Question[]) =>
  questions
    .filter((question) => question.selected)
    .map((question) => [question.id, question.text.trim()])
    .sort(([left], [right]) => left.localeCompare(right))

export const selectedDepartments = (departments: Department[]) =>
  departments
    .filter((department) => department.selected)
    .map((department) => [department.id, department.name.trim()])
    .sort(([left], [right]) => left.localeCompare(right))

// The search returns several fragments per document: keep the best one of each.
export const bestMatchPerDocument = (matches: KnowledgeMatch[]) => {
  const best = new Map<string, KnowledgeMatch>()
  for (const match of matches) {
    const current = best.get(match.documentId)
    if (!current || match.score > current.score)
      best.set(match.documentId, match)
  }
  return [...best.values()].sort((a, b) => b.score - a.score)
}
