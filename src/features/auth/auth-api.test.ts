import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api-client'
import { login } from './auth-api'

describe('login', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it('wysyła dane do endpointu logowania i zwraca sesję', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      accessToken: 'test-token',
    })
    const credentials = { email: 'user@example.test', password: 'example' }
    await expect(login(credentials)).resolves.toEqual({
      email: credentials.email,
      accessToken: 'test-token',
    })
    expect(post).toHaveBeenCalledWith('/api/auth/login', credentials)
  })

  it('odrzuca odpowiedź bez tokenu', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test')
    vi.spyOn(apiClient, 'post').mockResolvedValue({})
    await expect(
      login({ email: 'user@example.test', password: 'example' }),
    ).rejects.toThrow('missing access token')
  })

  it('nie wysyła danych bez konfiguracji adresu API', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    const post = vi.spyOn(apiClient, 'post')
    await expect(
      login({ email: 'user@example.test', password: 'example' }),
    ).rejects.toThrow('VITE_API_BASE_URL')
    expect(post).not.toHaveBeenCalled()
  })
})
