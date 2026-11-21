import { useQuery } from '@tanstack/react-query'
import type { ApiError } from '../client'
import { queryKeys } from '../query-keys'
import { useSessionEmail } from '../session'
import { getDepartments } from './departments.api'
import type { Department } from './departments.schemas'

export const useGetDepartments = () => {
  const email = useSessionEmail()
  const { data, isLoading, isError, refetch } = useQuery<
    Department[],
    ApiError
  >({
    queryKey: queryKeys.departments.all(email),
    queryFn: ({ signal }) => getDepartments(signal),
    // The dictionary of departments changes rarely.
    staleTime: 5 * 60_000,
  })

  return {
    departments: data,
    isDepartmentsLoading: isLoading,
    isDepartmentsError: isError,
    refetchDepartments: refetch,
  }
}
