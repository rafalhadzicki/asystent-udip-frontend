import { useCreateCase } from '@/api/cases/cases.queries'
import { useDemoStore } from '@/features/demo/demo-store'
import type { UploadDraft } from '@/features/demo/types'
import { splitQuestions } from './verification/verification-utils'

export type VerifiedCaseValues = {
  applicant: string
  reference: string
  subject: string
  writtenAt: string
  receivedAt: string
  requestText: string
}

// Creates the case on the backend, then keeps the fields the API does not
// store yet (writing date, preliminary questions) locally under the new id.
// Rejects with the original error so the caller can map it to the form.
export const useCreateCaseFromDraft = (draft: UploadDraft) => {
  const { updateCase, setUploadDraft } = useDemoStore()
  const { createCaseAsync, isCreatingCase } = useCreateCase()

  const createFromDraft = async (values: VerifiedCaseValues) => {
    const requestText = values.requestText.trim()
    const created = await createCaseAsync({
      file: draft.file,
      caseNumber: values.reference.trim(),
      requesterName: values.applicant.trim(),
      subject: values.subject.trim(),
      receivedAt: values.receivedAt.trim(),
      requestText,
    })
    updateCase(created.id, {
      writtenAt: values.writtenAt.trim(),
      questions: splitQuestions(requestText),
    })
    setUploadDraft(null)
    return created.id
  }

  return { createFromDraft, isCreatingCase }
}
