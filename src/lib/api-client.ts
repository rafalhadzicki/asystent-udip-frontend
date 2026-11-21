import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'

export type RequestConfig<TData = unknown> = Omit<
  AxiosRequestConfig<TData>,
  'url' | 'method' | 'data'
>

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
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
