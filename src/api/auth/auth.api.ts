import { apiClient } from '../client'
import { clearSession } from '../session'
import {
  loginResponseSchema,
  type AuthSession,
  type LoginCredentials,
} from './auth.schemas'

export const login = async (
  credentials: LoginCredentials,
): Promise<AuthSession> => {
  const response = await apiClient.post<unknown, LoginCredentials>(
    '/api/auth/login',
    credentials,
  )
  const { accessToken } = loginResponseSchema.parse(response)
  return { email: credentials.email, accessToken }
}

export const logout = clearSession
