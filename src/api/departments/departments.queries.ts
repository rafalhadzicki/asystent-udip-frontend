import { useQuery } from '@tanstack/react-query'
import type { ApiError } from '../client'
import { queryKeys } from '../query-keys'
import { useSessionEmail } from '../session'
import { getDepartments } from './departments.api'
import type { Department } from './departments.schemas'

export const useGetDepartments = () => {
  const email = useSessionEmail()
  const { data, isLoading, isError, error, refetch } = useQuery<
    Department[],
    ApiError
  >({
    queryKey: queryKeys.departments.all(email),
    queryFn: ({ signal }) => getDepartments(signal),
    // The dictionary of departments changes rarely.
    staleTime: 5 * 60_000,
    select: (list) => list.filter((department) => department.isActive),
  })

  return {
    departments: data,
    isDepartmentsLoading: isLoading,
    isDepartmentsError: isError,
    departmentsError: error,
    refetchDepartments: refetch,
  }
}
