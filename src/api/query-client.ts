import {
  MutationCache,
  QueryCache,
  QueryClient,
  isCancelledError,
} from '@tanstack/react-query'
import { getErrorStatus } from './client'
import { subscribeToSession } from './session'

const MAX_RETRIES = 2

const reportError = (error: unknown) => {
  // 401 is handled by the HTTP client (session reset); cancelled requests are expected.
  if (isCancelledError(error) || getErrorStatus(error) === 401) return
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    console.error('[api]', error)
  }
}

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({ onError: reportError }),
    mutationCache: new MutationCache({ onError: reportError }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const status = getErrorStatus(error)
          if (status !== undefined && status >= 400 && status < 500)
            return false
          return failureCount < MAX_RETRIES
        },
      },
      mutations: { retry: false },
    },
  })

export const queryClient = createQueryClient()

// Any session change (login, logout, expired token) drops all server state.
subscribeToSession(() => queryClient.clear())
