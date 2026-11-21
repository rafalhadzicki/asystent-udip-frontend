import { apiClient } from '@/lib/api-client'

export type LoginCredentials = {
  email: string
  password: string
}

export type AuthSession = {
  email: string
  accessToken: string
}

export const login = async (
  credentials: LoginCredentials,
): Promise<AuthSession> => {
  if (!import.meta.env.VITE_API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL is not configured')
  }
  const response = await apiClient.post<
    { accessToken: string },
    LoginCredentials
  >('/api/auth/login', credentials)
  if (typeof response.accessToken !== 'string' || !response.accessToken) {
    throw new Error('Invalid login response: missing access token')
  }
  return { email: credentials.email, accessToken: response.accessToken }
}
