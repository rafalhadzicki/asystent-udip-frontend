import type { Department, Question } from '@/features/demo/types'

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
