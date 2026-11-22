import { useCheckCaseNumber } from '@/api/cases/cases.queries'
import {
  caseNumberConflictSchema,
  type CaseNumberConflict,
} from '@/api/cases/cases.schemas'
import { getApiErrorCode } from '@/api/errors'
import { validIsoDate } from '@/features/cases/date-utils'
import { useDebouncedValue } from '@/lib/use-debounced-value'

const CHECK_DELAY_MS = 500

// Asks the backend whether a case number is free once typing pauses.
// `exceptId` excludes the case being edited from the comparison.
export const useCaseNumberConflict = ({
  caseNumber,
  receivedAt,
  exceptId,
}: {
  caseNumber: string
  receivedAt: string
  exceptId?: string
}): CaseNumberConflict | null => {
  const debouncedNumber = useDebouncedValue(caseNumber.trim(), CHECK_DELAY_MS)
  const { caseNumberCheck } = useCheckCaseNumber(
    debouncedNumber
      ? {
          caseNumber: debouncedNumber,
          year: validIsoDate(receivedAt)
            ? Number(receivedAt.slice(0, 4))
            : undefined,
          exceptId,
        }
      : undefined,
  )
  // A result for an older number must not block the one being typed now.
  if (caseNumberCheck?.caseNumber !== caseNumber.trim()) return null
  return caseNumberCheck.conflict ?? null
}

// A 409 on save carries the same code as the check; other 409s return null.
export const getCaseNumberConflict = (
  error: unknown,
): CaseNumberConflict | null => {
  const parsed = caseNumberConflictSchema.safeParse(getApiErrorCode(error))
  return parsed.success ? parsed.data : null
}
