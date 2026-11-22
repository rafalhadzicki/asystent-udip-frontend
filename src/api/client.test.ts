import axios, { AxiosError, type AxiosAdapter } from 'axios'
import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import { apiClient, REQUEST_TIMEOUT_MS } from './client'
import { getSession, setSession } from './session'

const respond = (status = 200, data: unknown = {}) =>
  vi.fn<AxiosAdapter>(async (config) => {
    const response = { data, status, statusText: '', headers: {}, config }
    if (status >= 400)
      throw new AxiosError('Request failed', undefined, config, null, response)
    return response
  })

describe('apiClient', () => {
  afterEach(() => setSession(null))

  it('sends the session cookie, API address and timeout with every request', async () => {
    const adapter = respond()
    await apiClient.get('/api/cases', { adapter })
    const config = adapter.mock.calls[0][0]
    expect(config.withCredentials).toBe(true)
    expect(config.headers.has('Authorization')).toBe(false)
    expect(config.baseURL).toBe('https://api.example.test')
    expect(config.timeout).toBe(REQUEST_TIMEOUT_MS)
  })

  it('ends the session after a 401 from any endpoint except sign-in', async () => {
    setSession({ id: 'u', email: 'user@example.test' })
    await expect(
      apiClient.get('/api/cases', { adapter: respond(401) }),
    ).rejects.toBeInstanceOf(AxiosError)
    expect(getSession()).toBeNull()
  })

  it.each(['/api/auth/login', '/api/auth/register'])(
    'nie kończy sesji po 401 z %s',
    async (url) => {
      const session = { id: 'u', email: 'user@example.test' }
      setSession(session)
      await expect(
        apiClient.post(url, {}, { adapter: respond(401) }),
      ).rejects.toBeInstanceOf(AxiosError)
      expect(getSession()).toBe(session)
    },
  )

  it('leaves the session alone on other errors', async () => {
    const session = { id: 'u', email: 'user@example.test' }
    setSession(session)
    await expect(
      apiClient.get('/api/cases', { adapter: respond(403) }),
    ).rejects.toBeInstanceOf(AxiosError)
    expect(getSession()).toBe(session)
  })

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

  it('passes responseType for file downloads', async () => {
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

  it('propagates transport errors instead of turning them into a success', async () => {
    const error = new AxiosError('Network error', 'ERR_NETWORK')
    const adapter = vi.fn<AxiosAdapter>().mockRejectedValue(error)

    await expect(apiClient.get('/cases', { adapter })).rejects.toBe(error)
  })

  it('passes the signal and honours request cancellation', async () => {
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
