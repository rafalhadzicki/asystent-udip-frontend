import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { createQueryClient, queryClient } from './query-client'
import { setSession } from './session'

describe('queryClient', () => {
  it('czyści cache przy każdej zmianie sesji', () => {
    setSession({ email: 'a@example.test', accessToken: 'a' })
    queryClient.setQueryData(['user', 'a@example.test', 'cases'], [1])
    setSession({ email: 'b@example.test', accessToken: 'b' })
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('nie ponawia zapytań po błędach 4xx, ale ponawia błędy sieci', () => {
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
    expect(retry(0, new AxiosError('Network error'))).toBe(true)
    expect(retry(2, new AxiosError('Network error'))).toBe(false)
  })
})
