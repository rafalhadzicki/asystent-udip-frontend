import { createQueryClient } from '@/api/query-client'

export const createTestQueryClient = () => {
  const client = createQueryClient()
  const defaults = client.getDefaultOptions()
  client.setDefaultOptions({
    ...defaults,
    queries: { ...defaults.queries, retry: false },
  })
  return client
}
