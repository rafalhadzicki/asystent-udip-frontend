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
  it('posts the credentials to the login endpoint and returns the user', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(user)
    const credentials = { email: user.email, password: 'example' }
    await expect(login(credentials)).resolves.toEqual(user)
    expect(post).toHaveBeenCalledWith('/api/auth/login', credentials)
  })

  it('rejects a response without a user', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({})
    await expect(
      login({ email: user.email, password: 'example' }),
    ).rejects.toBeInstanceOf(ZodError)
  })
})

describe('getCurrentUser', () => {
  it('fetches the signed-in user', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue(user)
    await expect(getCurrentUser()).resolves.toEqual(user)
    expect(get).toHaveBeenCalledWith('/api/auth/me')
  })
})

describe('logout', () => {
  it('calls the endpoint and ends the session', async () => {
    setSession(user)
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(undefined)
    await logout()
    expect(post).toHaveBeenCalledWith('/api/auth/logout')
    expect(getSession()).toBeNull()
  })

  it('ends the session locally even when the request fails', async () => {
    setSession(user)
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('offline'))
    await expect(logout()).resolves.toBeUndefined()
    expect(getSession()).toBeNull()
  })
})
