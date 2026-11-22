import { apiClient } from '../client'
import { clearSession } from '../session'
import {
  userSchema,
  type AuthSession,
  type LoginCredentials,
} from './auth.schemas'

export const login = async (
  credentials: LoginCredentials,
): Promise<AuthSession> =>
  userSchema.parse(
    await apiClient.post<unknown, LoginCredentials>(
      '/api/auth/login',
      credentials,
    ),
  )

export const getCurrentUser = async (): Promise<AuthSession> =>
  userSchema.parse(await apiClient.get<unknown>('/api/auth/me'))

// The cookie can only be removed by the server, but the local session ends
// even when that request fails.
export const logout = async () => {
  try {
    await apiClient.post('/api/auth/logout')
  } catch {
    // Nothing to recover: the user is signed out in the app either way.
  } finally {
    clearSession()
  }
}
