import axios, { AxiosError, type AxiosAdapter } from 'axios'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { apiClient } from './api-client'

describe('apiClient', () => {
  it.each(['get', 'delete'] as const)(
    '%s przekazuje parametry i zwraca wyłącznie dane odpowiedzi',
    async (method) => {
      const data = { items: [{ id: 'case-1' }] }
      const adapter = vi.fn<AxiosAdapter>(async (config) => ({
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }))

      const result = await apiClient[method]<typeof data>('/cases', {
        params: { page: 2 },
        adapter,
      })

      expect(result).toEqual(data)
      expect(adapter.mock.calls[0][0]).toMatchObject({
        method,
        url: '/cases',
        params: { page: 2 },
      })
    },
  )

  it.each(['post', 'put', 'patch'] as const)(
    '%s przekazuje typowany payload i konfigurację uploadu',
    async (method) => {
      const payload = { title: 'Wniosek demonstracyjny' }
      const data = { id: 'case-1' }
      const onUploadProgress = vi.fn()
      const adapter = vi.fn<AxiosAdapter>(async (config) => ({
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      }))

      const result = await apiClient[method]<typeof data, typeof payload>(
        '/cases',
        payload,
        { adapter, onUploadProgress },
      )

      expect(result).toEqual(data)
      expect(adapter.mock.calls[0][0]).toMatchObject({
        method,
        url: '/cases',
        data: JSON.stringify(payload),
        onUploadProgress,
      })
      expectTypeOf(apiClient[method]<typeof data, typeof payload>)
        .parameter(1)
        .toEqualTypeOf<typeof payload | undefined>()
    },
  )

  it('przekazuje responseType dla pobierania plików', async () => {
    const data = new Blob(['demo'], { type: 'application/pdf' })
    const adapter = vi.fn<AxiosAdapter>(async (config) => ({
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }))

    expect(
      await apiClient.get<Blob>('/documents/demo', {
        adapter,
        responseType: 'blob',
      }),
    ).toBe(data)
    expect(adapter.mock.calls[0][0].responseType).toBe('blob')
  })

  it('propaguje błędy transportu bez zamiany na udaną odpowiedź', async () => {
    const error = new AxiosError('Network error', 'ERR_NETWORK')
    const adapter = vi.fn<AxiosAdapter>().mockRejectedValue(error)

    await expect(apiClient.get('/cases', { adapter })).rejects.toBe(error)
  })

  it('przekazuje signal i respektuje anulowanie requestu', async () => {
    const controller = new AbortController()
    const adapter = vi.fn<AxiosAdapter>(async (config) => ({
      data: [],
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }))

    await apiClient.get('/cases', { adapter, signal: controller.signal })
    expect(adapter.mock.calls[0][0].signal).toBe(controller.signal)

    controller.abort()
    await expect(
      apiClient.get('/cases', { adapter, signal: controller.signal }),
    ).rejects.toSatisfy(axios.isCancel)
    expect(adapter).toHaveBeenCalledTimes(1)
  })
})
