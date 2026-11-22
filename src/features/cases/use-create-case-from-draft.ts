import {
  useCreateCase,
  useSetCaseDepartments,
  useSetCaseQuestions,
} from '@/api/cases/cases.queries'
import { useLocalStore } from '@/features/cases/local-store'
import type { UploadDraft } from '@/features/cases/types'
import { splitQuestions } from './verification/verification-utils'

export type VerifiedCaseValues = {
  applicant: string
  applicantEmail: string
  applicantAddress: string
  reference: string
  subject: string
  writtenAt: string
  receivedAt: string
  requestText: string
}

// Creates the case on the backend and saves what the analysis suggested: the
// questions (the regex split of the text when the AI returned none) and the
// departments. The AI reasons stay locally, because the API stores no reasons.
// A failure after the case exists is not fatal: the analysis page lets the user
// set both lists again. Rejects with the original error of the creation only.
export const useCreateCaseFromDraft = (draft: UploadDraft) => {
  const { updateCase, setUploadDraft } = useLocalStore()
  const { createCaseAsync, isCreatingCase } = useCreateCase()
  const { setCaseQuestionsAsync } = useSetCaseQuestions()
  const { setCaseDepartmentsAsync } = useSetCaseDepartments()

  const saveSuggestions = async (id: string, requestText: string) => {
    const questions =
      draft.questions.length > 0
        ? draft.questions
        : splitQuestions(requestText).map((text) => ({ text }))
    if (questions.length > 0) await setCaseQuestionsAsync({ id, questions })
    if (draft.departments.length > 0)
      await setCaseDepartmentsAsync({
        id,
        departmentIds: draft.departments.map(
          ({ id: departmentId }) => departmentId,
        ),
      })
  }

  const createFromDraft = async (values: VerifiedCaseValues) => {
    const requestText = values.requestText.trim()
    const created = await createCaseAsync({
      file: draft.file,
      caseNumber: values.reference.trim(),
      requesterName: values.applicant.trim(),
      requesterEmail: values.applicantEmail.trim() || undefined,
      requesterAddress: values.applicantAddress.trim() || undefined,
      subject: values.subject.trim(),
      receivedAt: values.receivedAt.trim(),
      writtenAt: values.writtenAt.trim() || undefined,
      requestText,
    })
    updateCase(created.id, {
      analysisNeedsReview: true,
      departmentReasons: Object.fromEntries(
        draft.departments.map(({ id, reason }) => [id, reason]),
      ),
    })
    try {
      await saveSuggestions(created.id, requestText)
    } catch (error) {
      console.error('Cannot save the suggestions of the analysis', error)
    }
    setUploadDraft(null)
    return created.id
  }

  return { createFromDraft, isCreatingCase }
}
