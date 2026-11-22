import { DEMO_STORAGE_KEY } from '@/features/demo/demo-store'
import type { CaseItem } from '@/features/demo/types'

// The case as the user sees it after saves: the fixture plus the local overlay.
export const readSavedCase = (item: CaseItem): CaseItem => ({
  ...item,
  ...JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) ?? '{}').overlays?.[
    item.id
  ],
})
