import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { apiClient } from '../client'
import { getSession, setSession } from '../session'
import { getCurrentUser, login, logout } from './auth.api'

const user = {
  id: '3f0c1d2e-5a4b-4c6d-8e7f-9a0b1c2d3e4f',
  email: 'user@example.test',
}

afterEach(() => {
  vi.restoreAllMocks()
  setSession(null)
})

describe('login', () => {
  it('wysyła dane do endpointu logowania i zwraca użytkownika', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(user)
    const credentials = { email: user.email, password: 'example' }
    await expect(login(credentials)).resolves.toEqual(user)
    expect(post).toHaveBeenCalledWith('/api/auth/login', credentials)
  })

  it('odrzuca odpowiedź bez użytkownika', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({})
    await expect(
      login({ email: user.email, password: 'example' }),
    ).rejects.toBeInstanceOf(ZodError)
  })
})

describe('getCurrentUser', () => {
  it('pobiera zalogowanego użytkownika', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(user)
    await expect(getCurrentUser()).resolves.toEqual(user)
    expect(get).toHaveBeenCalledWith('/api/auth/me')
  })
})

describe('logout', () => {
  it('wywołuje endpoint i kończy sesję', async () => {
    setSession(user)
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(undefined)
    await logout()
    expect(post).toHaveBeenCalledWith('/api/auth/logout')
    expect(getSession()).toBeNull()
  })

  it('kończy sesję lokalnie, nawet gdy żądanie się nie powiedzie', async () => {
    setSession(user)
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('offline'))
    await expect(logout()).resolves.toBeUndefined()
    expect(getSession()).toBeNull()
  })
})
