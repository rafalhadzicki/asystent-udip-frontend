import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { ApiError } from '../client'
import { queryKeys } from '../query-keys'
import { useSessionEmail } from '../session'
import {
  createKnowledgeDocument,
  deleteKnowledgeDocument,
  getKnowledgeDocument,
  getKnowledgeList,
  reindexKnowledgeDocument,
  updateKnowledgeDocument,
} from './knowledge.api'
import type {
  CreateKnowledgeInput,
  KnowledgeDocument,
  KnowledgeDocumentDetail,
  KnowledgeList,
  KnowledgeListParams,
  UpdateKnowledgeInput,
} from './knowledge.schemas'

export const useGetKnowledgeList = (params: KnowledgeListParams) => {
  const email = useSessionEmail()
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<
    KnowledgeList,
    ApiError
  >({
    queryKey: queryKeys.knowledge.list(email, params),
    queryFn: ({ signal }) => getKnowledgeList(params, signal),
    placeholderData: keepPreviousData,
  })
  return {
    knowledgeList: data,
    isLoadingKnowledge: isLoading,
    isFetchingKnowledge: isFetching,
    isKnowledgeError: isError,
    knowledgeError: error,
    refetchKnowledge: refetch,
  }
}

export const useGetKnowledgeDocument = (id: string) => {
  const email = useSessionEmail()
  const { data, isLoading, isError, error } = useQuery<
    KnowledgeDocumentDetail,
    ApiError
  >({
    queryKey: queryKeys.knowledge.detail(email, id),
    queryFn: ({ signal }) => getKnowledgeDocument(id, signal),
  })
  return {
    knowledgeDocument: data,
    isLoadingKnowledgeDocument: isLoading,
    isKnowledgeDocumentError: isError,
    knowledgeDocumentError: error,
  }
}

// Any change can move a file between pages, filters and statuses, so the whole knowledge cache is refreshed.
const useKnowledgeMutation = <TVariables, TResult>(
  mutationFn: (variables: TVariables) => Promise<TResult>,
) => {
  const queryClient = useQueryClient()
  const email = useSessionEmail()
  return useMutation<TResult, ApiError, TVariables>({
    mutationFn,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.knowledge.all(email),
      }),
  })
}

export const useCreateKnowledgeDocument = () => {
  const { mutateAsync, isPending } = useKnowledgeMutation<
    CreateKnowledgeInput,
    KnowledgeDocument
  >(createKnowledgeDocument)
  return {
    createKnowledgeDocumentAsync: mutateAsync,
    isCreatingKnowledgeDocument: isPending,
  }
}

export const useUpdateKnowledgeDocument = () => {
  const { mutateAsync, isPending } = useKnowledgeMutation<
    UpdateKnowledgeInput,
    KnowledgeDocument
  >(updateKnowledgeDocument)
  return {
    updateKnowledgeDocumentAsync: mutateAsync,
    isUpdatingKnowledgeDocument: isPending,
  }
}

export const useDeleteKnowledgeDocument = () => {
  const { mutateAsync, isPending } = useKnowledgeMutation<string, void>(
    deleteKnowledgeDocument,
  )
  return {
    deleteKnowledgeDocumentAsync: mutateAsync,
    isDeletingKnowledgeDocument: isPending,
  }
}

export const useReindexKnowledgeDocument = () => {
  const { mutateAsync, isPending } = useKnowledgeMutation<
    string,
    KnowledgeDocument
  >(reindexKnowledgeDocument)
  return {
    reindexKnowledgeDocumentAsync: mutateAsync,
    isReindexingKnowledgeDocument: isPending,
  }
}
