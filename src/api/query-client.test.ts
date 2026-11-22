import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import { clearCacheOnSessionChange, createQueryClient } from './query-client'
import { setSession } from './session'

describe('queryClient', () => {
  it('clears the cache on every session change', () => {
    const client = createQueryClient()
    const unsubscribe = clearCacheOnSessionChange(client)
    setSession({ id: 'a', email: 'a@example.test' })
    client.setQueryData(['user', 'a@example.test', 'cases'], [1])
    setSession({ id: 'b', email: 'b@example.test' })
    expect(client.getQueryCache().getAll()).toHaveLength(0)
    unsubscribe()
  })

  it('does not retry after 4xx errors but retries network errors', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry
    if (typeof retry !== 'function') throw new Error('retry is not a function')
    const clientError = new AxiosError(
      'Not found',
      undefined,
      undefined,
      null,
      {
        data: {},
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: { headers: new AxiosHeaders() },
      },
    )
    expect(retry(0, clientError)).toBe(false)
    expect(retry(0, new ZodError([]))).toBe(false)
    expect(retry(0, new AxiosError('Network error'))).toBe(true)
    expect(retry(2, new AxiosError('Network error'))).toBe(false)
  })
})
