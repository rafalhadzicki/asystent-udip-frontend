import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '../client'
import { setSession } from '../session'
import { login } from './auth.api'
import type { AuthSession, LoginCredentials } from './auth.schemas'

export const useLogin = () => {
  const { mutateAsync, isPending, isError, reset } = useMutation<
    AuthSession,
    ApiError,
    LoginCredentials
  >({
    mutationFn: login,
    // Credentials are kept in mutation variables; never keep them in the cache.
    gcTime: 0,
    onSuccess: setSession,
  })

  return {
    loginAsync: mutateAsync,
    isLoggingIn: isPending,
    isLoginError: isError,
    resetLogin: reset,
  }
}
