import { LOCAL_STORAGE_KEY } from '@/features/cases/local-store'
import type { CaseItem } from '@/features/cases/types'

// The case as the user sees it after saves: the fixture plus the local overlay.
export const readSavedCase = (item: CaseItem): CaseItem => ({
  ...item,
  ...JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '{}').overlays?.[
    item.id
  ],
})
