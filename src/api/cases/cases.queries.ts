import { useCallback, useEffect, useRef } from 'react'
import {
  keepPreviousData,
  useMutation,
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
import type {
  CaseDetail,
  CaseList,
  CaseListParams,
  ChangeCaseStatusInput,
  CreateCaseInput,
  ExtendDeadlineInput,
  RequestAnalysis,
  UpdateCaseInput,
} from './cases.schemas'

export const useGetCases = (params: CaseListParams) => {
  const email = useSessionEmail()
  const { data, isLoading, isFetching, isError, refetch } = useQuery<
    CaseList,
    ApiError
  >({
    queryKey: queryKeys.cases.list(email, params),
    queryFn: ({ signal }) => getCases(params, signal),
    placeholderData: keepPreviousData,
  })

  return {
    getCasesResponse: data,
    isCasesLoading: isLoading,
    isCasesFetching: isFetching,
    isCasesError: isError,
    refetchCases: refetch,
  }
}

export const useGetCaseYears = () => {
  const email = useSessionEmail()
  const { data, isLoading, isError } = useQuery<number[], ApiError>({
    queryKey: queryKeys.cases.years(email),
    queryFn: ({ signal }) => getCaseYears(signal),
  })

  return {
    caseYears: data,
    isCaseYearsLoading: isLoading,
    isCaseYearsError: isError,
  }
}

export const useGetCaseById = (id: string | undefined) => {
  const email = useSessionEmail()
  const { data, isLoading, isError, refetch } = useQuery<CaseDetail, ApiError>({
    queryKey: queryKeys.cases.detail(email, id ?? ''),
    queryFn: ({ signal }) => getCase(id ?? '', signal),
    enabled: !!id,
  })

  return {
    caseDetail: data,
    isCaseLoading: isLoading,
    isCaseError: isError,
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
  const { mutate, mutateAsync, isPending, isError } =
    useCaseMutation<CreateCaseInput>(createCase)
  return {
    createCase: mutate,
    createCaseAsync: mutateAsync,
    isCreatingCase: isPending,
    isCreateCaseError: isError,
  }
}

export const useUpdateCase = () => {
  const { mutate, mutateAsync, isPending, isError } =
    useCaseMutation<UpdateCaseInput>(updateCase)
  return {
    updateCase: mutate,
    updateCaseAsync: mutateAsync,
    isUpdatingCase: isPending,
    isUpdateCaseError: isError,
  }
}

export const useChangeCaseStatus = () => {
  const { mutate, mutateAsync, isPending, isError } =
    useCaseMutation<ChangeCaseStatusInput>(changeCaseStatus)
  return {
    changeCaseStatus: mutate,
    changeCaseStatusAsync: mutateAsync,
    isChangingCaseStatus: isPending,
    isChangeCaseStatusError: isError,
  }
}

export const useExtendDeadline = () => {
  const { mutate, mutateAsync, isPending, isError } =
    useCaseMutation<ExtendDeadlineInput>(extendDeadline)
  return {
    extendDeadline: mutate,
    extendDeadlineAsync: mutateAsync,
    isExtendingDeadline: isPending,
    isExtendDeadlineError: isError,
  }
}

export const useCancelExtension = () => {
  const { mutate, mutateAsync, isPending, isError } =
    useCaseMutation<string>(cancelExtension)
  return {
    cancelExtension: mutate,
    cancelExtensionAsync: mutateAsync,
    isCancellingExtension: isPending,
    isCancelExtensionError: isError,
  }
}

// Mutations have no built-in abort signal, so the hook owns one controller:
// starting a new analysis or cancelling aborts the request in flight.
export const useAnalyzeRequest = () => {
  const controllerRef = useRef<AbortController | null>(null)
  const { mutate, reset, isPending, isError } = useMutation<
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
  }
}
