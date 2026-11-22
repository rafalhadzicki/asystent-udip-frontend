import { Outlet } from 'react-router-dom'
import { useLocalStore } from '@/features/cases/local-store'
import type { CaseItem } from '@/features/cases/types'

// Stands in for CaseLayout: the case comes from the (mocked) server, the local
// fields from the store, exactly as composeApiCase merges them.
export const TestCaseOutlet = ({ item }: { item: CaseItem }) => {
  const { overlays } = useLocalStore()
  return <Outlet context={{ ...item, ...overlays[item.id] }} />
}
