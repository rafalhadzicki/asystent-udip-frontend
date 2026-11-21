import { useCallback, useEffect, useRef } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type MutateOptions,
} from '@tanstack/react-query'
import type { ApiError } from '../client'
import { queryKeys } from '../query-keys'
import { useSessionEmail } from '../session'
import {
  analyzeRequest,
  cancelExtension,
  changeCaseStatus,
  createCase,
  extendDeadline,
  getCase,
  getCaseYears,
  getCases,
  updateCase,
} from './cases.api'
import {
  UNFINISHED_STATUSES,
  type CaseDetail,
  type CaseList,
  type CaseListParams,
  type CaseUrgency,
  type ChangeCaseStatusInput,
  type CreateCaseInput,
  type ExtendDeadlineInput,
  type RequestAnalysis,
  type UpdateCaseInput,
} from './cases.schemas'

export const useGetCases = (
  params: CaseListParams,
  { enabled = true }: { enabled?: boolean } = {},
) => {
  const email = useSessionEmail()
  const {
    data,
    isLoading,
    isFetching,
    isPlaceholderData,
    isError,
    error,
    refetch,
  } = useQuery<CaseList, ApiError>({
    queryKey: queryKeys.cases.list(email, params),
    queryFn: ({ signal }) => getCases(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  })

  return {
    getCasesResponse: data,
    isCasesLoading: isLoading,
    isCasesFetching: isFetching,
    isCasesPlaceholder: isPlaceholderData,
    isCasesError: isError,
    casesError: error,
    refetchCases: refetch,
  }
}

const DEADLINE_SUMMARY_LIMIT = 500

// Counts deadlines of unfinished cases across the given years (the API lists one year at a time).
export const useGetDeadlineSummary = (years: number[]) => {
  const email = useSessionEmail()
  return useQueries({
    queries: years.map((year) => {
      const params: CaseListParams = {
        year,
        status: UNFINISHED_STATUSES,
        // Earliest deadlines first, so a page cap never hides the urgent ones.
        sort: 'DEADLINE_ASC',
        limit: DEADLINE_SUMMARY_LIMIT,
      }
      return {
        queryKey: queryKeys.cases.list(email, params),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          getCases(params, signal),
      }
    }),
    combine: (results) => {
      const items = results.flatMap(({ data }) => data?.items ?? [])
      const count = (urgency: CaseUrgency) =>
        items.filter((item) => item.urgency === urgency).length
      return {
        overdue: count('OVERDUE'),
        today: count('DUE_TODAY'),
        tomorrow: count('DUE_TOMORROW'),
        // The API caps a page, so a bigger year is only partially counted.
        isPartial: results.some(
          ({ data }) => data !== undefined && data.total > data.items.length,
        ),
        isLoading: results.some((result) => result.isLoading),
        isError: results.some((result) => result.isError),
      }
    },
  })
}

// Refreshes every cases query (lists, years, deadline summary) after a failure.
export const useRefetchCases = () => {
  const queryClient = useQueryClient()
  const email = useSessionEmail()
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.cases.all(email) })
}

export const useGetCaseYears = () => {
  const email = useSessionEmail()
  const { data, isLoading, isError, error } = useQuery<number[], ApiError>({
    queryKey: queryKeys.cases.years(email),
    queryFn: ({ signal }) => getCaseYears(signal),
  })

  return {
    caseYears: data,
    isCaseYearsLoading: isLoading,
    isCaseYearsError: isError,
    caseYearsError: error,
  }
}

export const useGetCaseById = (id: string | undefined) => {
  const email = useSessionEmail()
  const { data, isLoading, isError, error, refetch } = useQuery<
    CaseDetail,
    ApiError
  >({
    queryKey: queryKeys.cases.detail(email, id ?? ''),
    queryFn: ({ signal }) => getCase(id ?? '', signal),
    enabled: !!id,
  })

  return {
    caseDetail: data,
    isCaseLoading: isLoading,
    isCaseError: isError,
    caseError: error,
    refetchCase: refetch,
  }
}

// Every case mutation returns the fresh detail: store it and refresh the lists.
const useCaseMutation = <TVariables>(
  mutationFn: (variables: TVariables) => Promise<CaseDetail>,
) => {
  const queryClient = useQueryClient()
  const email = useSessionEmail()
  return useMutation<CaseDetail, ApiError, TVariables>({
    mutationFn,
    onSuccess: async (detail) => {
      queryClient.setQueryData(queryKeys.cases.detail(email, detail.id), detail)
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.cases.lists(email),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.cases.years(email),
        }),
      ])
    },
  })
}

export const useCreateCase = () => {
  const { mutate, mutateAsync, isPending, isError, error } =
    useCaseMutation<CreateCaseInput>(createCase)
  return {
    createCase: mutate,
    createCaseAsync: mutateAsync,
    isCreatingCase: isPending,
    isCreateCaseError: isError,
    createCaseError: error,
  }
}

export const useUpdateCase = () => {
  const { mutate, mutateAsync, isPending, isError, error } =
    useCaseMutation<UpdateCaseInput>(updateCase)
  return {
    updateCase: mutate,
    updateCaseAsync: mutateAsync,
    isUpdatingCase: isPending,
    isUpdateCaseError: isError,
    updateCaseError: error,
  }
}

export const useChangeCaseStatus = () => {
  const { mutate, mutateAsync, isPending, isError, error } =
    useCaseMutation<ChangeCaseStatusInput>(changeCaseStatus)
  return {
    changeCaseStatus: mutate,
    changeCaseStatusAsync: mutateAsync,
    isChangingCaseStatus: isPending,
    isChangeCaseStatusError: isError,
    changeCaseStatusError: error,
  }
}

export const useExtendDeadline = () => {
  const { mutate, mutateAsync, isPending, isError, error } =
    useCaseMutation<ExtendDeadlineInput>(extendDeadline)
  return {
    extendDeadline: mutate,
    extendDeadlineAsync: mutateAsync,
    isExtendingDeadline: isPending,
    isExtendDeadlineError: isError,
    extendDeadlineError: error,
  }
}

export const useCancelExtension = () => {
  const { mutate, mutateAsync, isPending, isError, error } =
    useCaseMutation<string>(cancelExtension)
  return {
    cancelExtension: mutate,
    cancelExtensionAsync: mutateAsync,
    isCancellingExtension: isPending,
    isCancelExtensionError: isError,
    cancelExtensionError: error,
  }
}

// Mutations have no built-in abort signal, so the hook owns one controller:
// starting a new analysis or cancelling aborts the request in flight.
export const useAnalyzeRequest = () => {
  const controllerRef = useRef<AbortController | null>(null)
  const { mutate, reset, isPending, isError, error } = useMutation<
    RequestAnalysis,
    ApiError,
    File
  >({
    mutationFn: (file) => {
      const controller = new AbortController()
      controllerRef.current = controller
      return analyzeRequest(file, controller.signal)
    },
    gcTime: 0,
  })

  const cancelAnalyzeRequest = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    // Detaches the observer, so callbacks of the cancelled call never fire.
    reset()
  }, [reset])

  const startAnalyzeRequest = useCallback(
    (file: File, options?: MutateOptions<RequestAnalysis, ApiError, File>) => {
      cancelAnalyzeRequest()
      mutate(file, options)
    },
    [cancelAnalyzeRequest, mutate],
  )

  useEffect(() => () => controllerRef.current?.abort(), [])

  return {
    analyzeRequest: startAnalyzeRequest,
    cancelAnalyzeRequest,
    isAnalyzingRequest: isPending,
    isAnalyzeRequestError: isError,
    analyzeRequestError: error,
  }
}
