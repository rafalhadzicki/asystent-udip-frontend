import { Outlet } from 'react-router-dom'
import { useDemoStore } from '@/features/demo/demo-store'
import type { CaseItem } from '@/features/demo/types'

// Stands in for CaseLayout: the case comes from the (mocked) server, the local
// fields from the store, exactly as composeApiCase merges them.
export const TestCaseOutlet = ({ item }: { item: CaseItem }) => {
  const { overlays } = useDemoStore()
  return <Outlet context={{ ...item, ...overlays[item.id] }} />
}
