import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { apiClient } from '../client'
import { login } from './auth.api'

describe('login', () => {
  afterEach(() => vi.restoreAllMocks())

  it('wysyła dane do endpointu logowania i zwraca sesję', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ accessToken: 'test-token' })
    const credentials = { email: 'user@example.test', password: 'example' }
    await expect(login(credentials)).resolves.toEqual({
      email: credentials.email,
      accessToken: 'test-token',
    })
    expect(post).toHaveBeenCalledWith('/api/auth/login', credentials)
  })

  it('odrzuca odpowiedź bez tokenu', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({})
    await expect(
      login({ email: 'user@example.test', password: 'example' }),
    ).rejects.toBeInstanceOf(ZodError)
  })
})
