import axios, {
  AxiosHeaders,
  type AxiosError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import type { ZodError } from 'zod'
import { clearSession, getSession } from './session'

export type RequestConfig<TData = unknown> = Omit<
  AxiosRequestConfig<TData>,
  'url' | 'method' | 'data'
>

// Transport errors come from Axios; contract violations from Zod schemas.
export type ApiError = AxiosError | ZodError

export const REQUEST_TIMEOUT_MS = 60_000

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers:
    import.meta.env.VITE_API_NGROK === 'true'
      ? { 'ngrok-skip-browser-warning': 'true' }
      : undefined,
})

httpClient.interceptors.request.use((config) => {
  if (!config.baseURL) {
    throw new Error('VITE_API_BASE_URL is not configured')
  }
  const accessToken = getSession()?.accessToken
  if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`)
  return config
})

httpClient.interceptors.response.use(undefined, (error: unknown) => {
  // Only an authenticated request can mean an expired session; a 401 from the
  // login endpoint means invalid credentials and is handled by the form.
  if (
    axios.isAxiosError(error) &&
    error.response?.status === 401 &&
    AxiosHeaders.from(error.config?.headers).has('Authorization')
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
