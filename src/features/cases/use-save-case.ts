import { useUpdateCase } from '@/api/cases/cases.queries'
import { useDemoStore } from '@/features/demo/demo-store'
import type { CaseItem } from '@/features/demo/types'

// Cases composed from the API save their server fields through PATCH and the
// rest locally; the deadline is computed by the backend and cannot be edited.
export const useSaveCase = (item: CaseItem) => {
  const { updateCase } = useDemoStore()
  const { updateCaseAsync } = useUpdateCase()

  return async (changes: Partial<CaseItem>) => {
    if (!item.apiStatus) {
      updateCase(item.id, changes)
      return
    }
    const remote = {
      caseNumber: changes.reference,
      subject: changes.subject,
      requesterName: changes.applicant,
      receivedAt: changes.receivedAt,
      requestText: changes.requestText,
    }
    const hasRemoteChanges = Object.values(remote).some(
      (value) => value !== undefined,
    )
    if (hasRemoteChanges) await updateCaseAsync({ id: item.id, ...remote })
    updateCase(item.id, changes)
  }
}
