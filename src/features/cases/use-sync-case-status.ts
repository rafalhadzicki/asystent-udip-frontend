import { useChangeCaseStatus } from '@/api/cases/cases.queries'
import type { CaseItem } from '@/features/cases/types'

// Keeps the status shown in the register in step with the work on the case.
// Finished cases are never moved, and a status already set is not resent.
export const useSyncCaseStatus = () => {
  const { changeCaseStatusAsync } = useChangeCaseStatus()
  return async (
    item: Pick<CaseItem, 'id' | 'apiStatus'>,
    status: 'SENT_TO_DEPARTMENTS' | 'RESPONSE_PREPARED',
  ) => {
    if (item.apiStatus === 'RESPONSE_SENT' || item.apiStatus === status) return
    await changeCaseStatusAsync({ id: item.id, status })
  }
}
