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
  checkCaseNumber,
  createCase,
  deleteCaseDocument,
  draftResponse,
  extendDeadline,
  getCase,
  getCaseYears,
  getCases,
  getDeadlinePreview,
  getRedactionSuggestions,
  setCaseDepartments,
  setCaseQuestions,
  updateCase,
  uploadCaseDocument,
} from './cases.api'
import {
  UNFINISHED_STATUSES,
  type CaseDetail,
  type CaseList,
  type CaseListParams,
  type CaseNumberCheck,
  type CaseNumberCheckParams,
  type CaseUrgency,
  type ChangeCaseStatusInput,
  type CaseDocument,
  type CreateCaseInput,
  type DeleteCaseDocumentInput,
  type DraftResponse,
  type DraftResponseInput,
  type RedactionSuggestion,
  type RedactionSuggestionsInput,
  type SetCaseDepartmentsInput,
  type SetCaseQuestionsInput,
  type UploadCaseDocumentInput,
  type DeadlinePreview,
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

// Every case received in the given years, nearest deadline first. The API lists
// one receipt year at a time, so a calendar needs the previous year as well.
export const useGetCasesOfYears = (years: number[]) => {
  const email = useSessionEmail()
  return useQueries({
    queries: years.map((year) => {
      const params: CaseListParams = {
        year,
        sort: 'DEADLINE_ASC',
        limit: DEADLINE_SUMMARY_LIMIT,
      }
      return {
        queryKey: queryKeys.cases.list(email, params),
        queryFn: ({ signal }: { signal: AbortSignal }) =>
          getCases(params, signal),
      }
    }),
    combine: (results) => ({
      items: results.flatMap(({ data }) => data?.items ?? []),
      // The API caps a page, so a bigger year is only partially listed.
      isPartial: results.some(
        ({ data }) => data !== undefined && data.total > data.items.length,
      ),
      isLoading: results.some((result) => result.isLoading),
      isError: results.some((result) => result.isError),
    }),
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

// The statutory deadline the backend would compute; skipped without a date.
export const useGetDeadlinePreview = (receivedAt: string | undefined) => {
  const email = useSessionEmail()
  const { data, isFetching, isError } = useQuery<DeadlinePreview, ApiError>({
    queryKey: queryKeys.cases.deadlinePreview(email, receivedAt ?? ''),
    queryFn: ({ signal }) => getDeadlinePreview(receivedAt ?? '', signal),
    enabled: !!receivedAt,
  })

  return {
    deadlinePreview: receivedAt ? data : undefined,
    isDeadlinePreviewFetching: isFetching,
    isDeadlinePreviewError: isError,
  }
}

// Tells whether a case number is free before saving; skipped without a number.
export const useCheckCaseNumber = (
  params: CaseNumberCheckParams | undefined,
) => {
  const email = useSessionEmail()
  const { data, isFetching } = useQuery<CaseNumberCheck, ApiError>({
    queryKey: queryKeys.cases.numberCheck(email, params ?? { caseNumber: '' }),
    queryFn: ({ signal }) =>
      checkCaseNumber(params ?? { caseNumber: '' }, signal),
    enabled: !!params?.caseNumber,
    staleTime: 0,
  })

  return {
    caseNumberCheck: params?.caseNumber ? data : undefined,
    isCaseNumberChecking: isFetching,
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

export const useSetCaseQuestions = () => {
  const { mutateAsync, isPending } =
    useCaseMutation<SetCaseQuestionsInput>(setCaseQuestions)
  return {
    setCaseQuestionsAsync: mutateAsync,
    isSettingCaseQuestions: isPending,
  }
}

export const useSetCaseDepartments = () => {
  const { mutateAsync, isPending } =
    useCaseMutation<SetCaseDepartmentsInput>(setCaseDepartments)
  return {
    setCaseDepartmentsAsync: mutateAsync,
    isSettingCaseDepartments: isPending,
  }
}

// Files change the `documents` of the case, so its detail is fetched again.
const useDocumentMutation = <TVariables extends { caseId: string }, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) => {
  const queryClient = useQueryClient()
  const email = useSessionEmail()
  return useMutation<TResult, ApiError, TVariables>({
    mutationFn,
    onSuccess: (_result, { caseId }) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.cases.detail(email, caseId),
      }),
  })
}

export const useUploadCaseDocument = () => {
  const { mutateAsync, isPending } = useDocumentMutation<
    UploadCaseDocumentInput,
    CaseDocument
  >(uploadCaseDocument)
  return {
    uploadCaseDocumentAsync: mutateAsync,
    isUploadingCaseDocument: isPending,
  }
}

export const useDeleteCaseDocument = () => {
  const { mutateAsync, isPending } = useDocumentMutation<
    DeleteCaseDocumentInput,
    void
  >(deleteCaseDocument)
  return {
    deleteCaseDocumentAsync: mutateAsync,
    isDeletingCaseDocument: isPending,
  }
}

// AI results are never stored by the backend, so nothing is cached.
export const useDraftResponse = () => {
  const { mutateAsync, isPending, reset } = useMutation<
    DraftResponse,
    ApiError,
    DraftResponseInput
  >({ mutationFn: draftResponse, gcTime: 0 })
  return {
    draftResponseAsync: mutateAsync,
    isDraftingResponse: isPending,
    resetDraftResponse: reset,
  }
}

export const useRedactionSuggestions = () => {
  const { mutateAsync, isPending } = useMutation<
    RedactionSuggestion[],
    ApiError,
    RedactionSuggestionsInput
  >({
    mutationFn: async (input) =>
      (await getRedactionSuggestions(input)).suggestions,
    gcTime: 0,
  })
  return {
    getRedactionSuggestionsAsync: mutateAsync,
    isGettingRedactionSuggestions: isPending,
  }
}
