import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import type { ZodError } from 'zod'
import { clearSession } from './session'

export type RequestConfig<TData = unknown> = Omit<
  AxiosRequestConfig<TData>,
  'url' | 'method' | 'data'
>

// Transport errors come from Axios; contract violations from Zod schemas.
export type ApiError = AxiosError | ZodError

export const REQUEST_TIMEOUT_MS = 60_000
export const UPLOAD_TIMEOUT_MS = 150_000

const CREDENTIAL_URLS = ['/api/auth/login', '/api/auth/register']

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  // The session lives in an httpOnly cookie set by the server.
  withCredentials: true,
  headers:
    import.meta.env.VITE_API_NGROK === 'true'
      ? { 'ngrok-skip-browser-warning': 'true' }
      : undefined,
})

httpClient.interceptors.request.use((config) => {
  if (!config.baseURL) {
    throw new Error('VITE_API_BASE_URL is not configured')
  }
  return config
})

httpClient.interceptors.response.use(undefined, (error: unknown) => {
  // A 401 from the login or register endpoint means invalid credentials and is
  // handled by the form; anywhere else it means the session has expired.
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    !CREDENTIAL_URLS.includes(error.config?.url ?? '')
  ) {
    clearSession()
  }
  return Promise.reject(error)
})

export const apiClient = {
  get: async <T>(url: string, config?: RequestConfig): Promise<T> => {
    const response = await httpClient.get<T>(url, config)
    return response.data
  },
  post: async <T, TData = unknown>(
    url: string,
    data?: TData,
    config?: RequestConfig<TData>,
  ): Promise<T> => {
    const response = await httpClient.post<T, AxiosResponse<T>, TData>(
      url,
      data,
      config,
    )
    return response.data
  },
  put: async <T, TData = unknown>(
    url: string,
    data?: TData,
    config?: RequestConfig<TData>,
  ): Promise<T> => {
    const response = await httpClient.put<T, AxiosResponse<T>, TData>(
      url,
      data,
      config,
    )
    return response.data
  },
  patch: async <T, TData = unknown>(
    url: string,
    data?: TData,
    config?: RequestConfig<TData>,
  ): Promise<T> => {
    const response = await httpClient.patch<T, AxiosResponse<T>, TData>(
      url,
      data,
      config,
    )
    return response.data
  },
  delete: async <T>(url: string, config?: RequestConfig): Promise<T> => {
    const response = await httpClient.delete<T>(url, config)
    return response.data
  },
}

export const getErrorStatus = (error: unknown) =>
  axios.isAxiosError(error) ? error.response?.status : undefined
