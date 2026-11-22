import { beforeEach, describe, expect, it, vi } from 'vitest'

const stored = {
  id: '3f0c1d2e-5a4b-4c6d-8e7f-9a0b1c2d3e4f',
  email: 'a@example.test',
}

const loadSession = async () => {
  vi.resetModules()
  return import('./session')
}

beforeEach(() => localStorage.clear())

describe('session persistence', () => {
  it('restores a stored session after a reload', async () => {
    localStorage.setItem('asystent-udip-session', JSON.stringify(stored))
    const { getSession } = await loadSession()
    expect(getSession()).toEqual(stored)
  })

  it('stores the session on login and removes it on logout', async () => {
    const { setSession, clearSession, SESSION_STORAGE_KEY } =
      await loadSession()
    setSession(stored)
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? '')).toEqual(
      stored,
    )
    clearSession()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })

  it.each([
    'not json',
    '{"id":"x","email":"a@example.test"}',
    '{"email":"a@example.test"}',
    '{}',
  ])('ignores and drops a corrupted entry: %s', async (raw) => {
    localStorage.setItem('asystent-udip-session', raw)
    const { getSession, SESSION_STORAGE_KEY } = await loadSession()
    expect(getSession()).toBeNull()
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull()
  })
})
