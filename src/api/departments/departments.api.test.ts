import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { apiClient } from '../client'
import { getDepartments } from './departments.api'

describe('getDepartments', () => {
  afterEach(() => vi.restoreAllMocks())

  it('passes the signal and returns the list of departments', async () => {
    const data = [
      {
        id: 'id-1',
        name: 'Jednostka',
        symbol: 'J',
        kind: 'OFFICE',
        isActive: true,
      },
    ]
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(data)
    const signal = new AbortController().signal
    await expect(getDepartments(signal)).resolves.toEqual(data)
    expect(get).toHaveBeenCalledWith('/api/departments', { signal })
  })

  it('rejects a response that breaks the contract', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue([{ id: 'incomplete' }])
    await expect(getDepartments()).rejects.toBeInstanceOf(ZodError)
  })

  it('propagates transport errors', async () => {
    const error = new Error('network error')
    vi.spyOn(apiClient, 'get').mockRejectedValue(error)
    await expect(getDepartments()).rejects.toBe(error)
  })
})
