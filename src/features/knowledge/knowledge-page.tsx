import {
  KnowledgeDeleteDialog,
  KnowledgeFormDialog,
  KnowledgePreviewDialog,
  type KnowledgeSubmit,
} from './knowledge-dialogs'
import { CATEGORIES } from './knowledge-constants'
import {
  PageRoot,
  PageHeader,
  HeaderText,
  HeaderActions,
  Toolbar,
  SearchField,
  CategoryGroup,
  CategoryButton,
  ListPanel,
  HeaderCell,
  NameCell,
  ItemName,
  ItemDescription,
  FileMeta,
  CategoryChip,
  NoWrapCell,
  ActionsCell,
  EmptyState,
} from './knowledge-page.styles'
import {
  Alert,
  AlertTitle,
  Button,
  Chip,
  CircularProgress,
  InputAdornment,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material'
import {
  Eye,
  FilePen,
  FileText,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { displayDate } from '@/features/cases/date-utils'
import {
  useCreateKnowledgeDocument,
  useDeleteKnowledgeDocument,
  useGetKnowledgeList,
  useReindexKnowledgeDocument,
  useUpdateKnowledgeDocument,
} from '@/api/knowledge/knowledge.queries'
import type {
  KnowledgeCategory,
  KnowledgeDocument,
  KnowledgeIndexStatus,
} from '@/api/knowledge/knowledge.schemas'
import { getApiErrorKind } from '@/api/errors'
import { useAiErrorMessage } from '@/features/cases/use-ai-error-message'
import { useDebouncedValue } from '@/lib/use-debounced-value'

type CategoryFilter = KnowledgeCategory | 'all'

type DialogState =
  | { kind: 'add' }
  | { kind: 'update'; item: KnowledgeDocument }
  | { kind: 'preview'; item: KnowledgeDocument }
  | { kind: 'delete'; item: KnowledgeDocument }
  | null

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25]
const MAX_SEARCH_LENGTH = 200
const REINDEXABLE: readonly KnowledgeIndexStatus[] = ['PENDING', 'FAILED']
const INDEX_STATUS_COLORS: Record<
  KnowledgeIndexStatus,
  'success' | 'warning' | 'error' | 'default'
> = {
  INDEXED: 'success',
  PENDING: 'warning',
  NO_TEXT: 'default',
  FAILED: 'error',
}

export const KnowledgePage = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'knowledge' })
  const titleId = useId()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0])
  const [dialog, setDialog] = useState<DialogState>(null)
  const [feedback, setFeedback] = useState('')
  const [actionError, setActionError] = useState('')
  const toAiErrorMessage = useAiErrorMessage()
  const debouncedQuery = useDebouncedValue(query.trim())
  const {
    knowledgeList,
    isLoadingKnowledge,
    isKnowledgeError,
    refetchKnowledge,
  } = useGetKnowledgeList({
    q: debouncedQuery || undefined,
    category: category === 'all' ? undefined : category,
    limit: rowsPerPage,
    offset: page * rowsPerPage,
  })
  const { createKnowledgeDocumentAsync, isCreatingKnowledgeDocument } =
    useCreateKnowledgeDocument()
  const { updateKnowledgeDocumentAsync, isUpdatingKnowledgeDocument } =
    useUpdateKnowledgeDocument()
  const { deleteKnowledgeDocumentAsync, isDeletingKnowledgeDocument } =
    useDeleteKnowledgeDocument()
  const { reindexKnowledgeDocumentAsync, isReindexingKnowledgeDocument } =
    useReindexKnowledgeDocument()

  const visible = knowledgeList?.items ?? []
  const total = knowledgeList?.total ?? 0
  const hasFilters = Boolean(query) || category !== 'all'

  const closeDialog = () => {
    setDialog(null)
    setActionError('')
  }

  const handleAdd = async (values: KnowledgeSubmit) => {
    if (!values.file) return
    setActionError('')
    try {
      await createKnowledgeDocumentAsync({
        file: values.file,
        name: values.name,
        category: values.category,
      })
    } catch (error) {
      const kind = getApiErrorKind(error)
      setActionError(
        kind === 'tooLarge'
          ? t('errors.fileSize')
          : kind === 'unsupported'
            ? t('errors.fileType')
            : t('errors.addFailed'),
      )
      return
    }
    setFeedback(t('feedback.added', { name: values.name }))
    setPage(0)
    closeDialog()
  }

  const handleUpdate = async (
    item: KnowledgeDocument,
    values: KnowledgeSubmit,
  ) => {
    setActionError('')
    try {
      await updateKnowledgeDocumentAsync({
        id: item.id,
        name: values.name,
        category: values.category,
      })
    } catch {
      setActionError(t('errors.updateFailed'))
      return
    }
    setFeedback(t('feedback.updated', { name: values.name }))
    closeDialog()
  }

  const handleDelete = async (item: KnowledgeDocument) => {
    setActionError('')
    try {
      await deleteKnowledgeDocumentAsync(item.id)
    } catch {
      setActionError(t('errors.deleteFailed'))
      return
    }
    setFeedback(t('feedback.deleted', { name: item.name }))
    closeDialog()
  }

  const handleReindex = async (item: KnowledgeDocument) => {
    setFeedback('')
    setActionError('')
    try {
      const result = await reindexKnowledgeDocumentAsync(item.id)
      setFeedback(
        t('feedback.reindexed', {
          name: item.name,
          status: t(`indexStatus.${result.indexStatus}`),
        }),
      )
    } catch (error) {
      setActionError(toAiErrorMessage(error, t('errors.reindexFailed')))
    }
  }

  const clearFilters = () => {
    setQuery('')
    setCategory('all')
    setPage(0)
  }

  return (
    <PageRoot aria-labelledby={titleId}>
      <PageHeader>
        <HeaderText>
          <Typography id={titleId} variant="h1">
            {t('title')}
          </Typography>
          <Typography color="text.secondary">{t('subtitle')}</Typography>
        </HeaderText>
        <HeaderActions>
          <Typography variant="body2" color="text.secondary">
            {t('summary', { count: total })}
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={18} aria-hidden="true" />}
            onClick={() => setDialog({ kind: 'add' })}
          >
            {t('add')}
          </Button>
        </HeaderActions>
      </PageHeader>

      <Alert severity="info">
        <AlertTitle>{t('notice.title')}</AlertTitle>
        {t('notice.body')}
      </Alert>

      {actionError && !dialog && (
        <Alert severity="error" onClose={() => setActionError('')}>
          {actionError}
        </Alert>
      )}
      {feedback && (
        <Alert severity="success" role="status" onClose={() => setFeedback('')}>
          {feedback}
        </Alert>
      )}

      <ListPanel elevation={0}>
        <Toolbar>
          <SearchField
            type="search"
            size="small"
            label={t('filters.searchLabel')}
            placeholder={t('filters.searchPlaceholder')}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value.slice(0, MAX_SEARCH_LENGTH))
              setPage(0)
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={18} aria-hidden="true" />
                  </InputAdornment>
                ),
              },
            }}
          />
          <CategoryGroup
            exclusive
            size="small"
            value={category}
            aria-label={t('filters.categoryLabel')}
            onChange={(_, value: CategoryFilter | null) => {
              if (!value) return
              setCategory(value)
              setPage(0)
            }}
          >
            {(['all', ...CATEGORIES] as const).map((value) => (
              <CategoryButton key={value} value={value}>
                {value === 'all' ? t('filters.all') : t(`categories.${value}`)}
              </CategoryButton>
            ))}
          </CategoryGroup>
        </Toolbar>

        {isKnowledgeError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" onClick={() => void refetchKnowledge()}>
                {t('table.retry')}
              </Button>
            }
          >
            {t('errors.loadFailed')}
          </Alert>
        ) : isLoadingKnowledge ? (
          <EmptyState>
            <CircularProgress aria-label={t('table.loading')} />
          </EmptyState>
        ) : total === 0 ? (
          <EmptyState>
            <Typography color="text.secondary">
              {t(hasFilters ? 'table.noMatches' : 'table.empty')}
            </Typography>
            {hasFilters && (
              <Button type="button" onClick={clearFilters}>
                {t('table.clearFilters')}
              </Button>
            )}
          </EmptyState>
        ) : (
          <>
            <TableContainer>
              <Table size="small" aria-label={t('table.label')}>
                <TableHead>
                  <TableRow>
                    <HeaderCell>{t('table.name')}</HeaderCell>
                    <HeaderCell>{t('table.category')}</HeaderCell>
                    <HeaderCell>{t('table.indexStatus')}</HeaderCell>
                    <HeaderCell>{t('table.updated')}</HeaderCell>
                    <HeaderCell align="right">{t('table.actions')}</HeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.map((item) => (
                    <TableRow key={item.id} hover>
                      <NameCell>
                        <ItemName variant="body2">{item.name}</ItemName>
                        {item.description && (
                          <ItemDescription
                            variant="body2"
                            color="text.secondary"
                          >
                            {item.description}
                          </ItemDescription>
                        )}
                        <FileMeta variant="caption">
                          <FileText size={14} aria-hidden="true" />
                          {t('table.file', { name: item.originalName })}
                        </FileMeta>
                      </NameCell>
                      <NoWrapCell>
                        <CategoryChip
                          size="small"
                          variant="outlined"
                          category={item.category}
                          label={t(`categories.${item.category}`)}
                        />
                      </NoWrapCell>
                      <NoWrapCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={INDEX_STATUS_COLORS[item.indexStatus]}
                          label={t(`indexStatus.${item.indexStatus}`)}
                        />
                      </NoWrapCell>
                      <NoWrapCell>{displayDate(item.updatedAt)}</NoWrapCell>
                      <ActionsCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Eye size={16} aria-hidden="true" />}
                          aria-label={t('table.previewLabel', {
                            name: item.name,
                          })}
                          onClick={() => setDialog({ kind: 'preview', item })}
                        >
                          {t('table.preview')}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<FilePen size={16} aria-hidden="true" />}
                          aria-label={t('table.updateLabel', {
                            name: item.name,
                          })}
                          onClick={() => setDialog({ kind: 'update', item })}
                        >
                          {t('table.update')}
                        </Button>
                        {REINDEXABLE.includes(item.indexStatus) && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={
                              <RefreshCw size={16} aria-hidden="true" />
                            }
                            aria-label={t('table.reindexLabel', {
                              name: item.name,
                            })}
                            disabled={isReindexingKnowledgeDocument}
                            onClick={() => void handleReindex(item)}
                          >
                            {t('table.reindex')}
                          </Button>
                        )}
                        <Button
                          size="small"
                          color="error"
                          variant="outlined"
                          startIcon={<Trash2 size={16} aria-hidden="true" />}
                          aria-label={t('table.deleteLabel', {
                            name: item.name,
                          })}
                          onClick={() => setDialog({ kind: 'delete', item })}
                        >
                          {t('table.delete')}
                        </Button>
                      </ActionsCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={total}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
              onPageChange={(_, next) => setPage(next)}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(Number(event.target.value))
                setPage(0)
              }}
              labelRowsPerPage={t('pagination.rowsPerPage')}
              labelDisplayedRows={({ from, to, count }) =>
                t('pagination.displayed', { from, to, count })
              }
              getItemAriaLabel={(type) => t(`pagination.${type}`)}
            />
          </>
        )}
      </ListPanel>

      {dialog?.kind === 'add' && (
        <KnowledgeFormDialog
          isSubmitting={isCreatingKnowledgeDocument}
          error={actionError}
          onClose={closeDialog}
          onSubmit={(values) => void handleAdd(values)}
        />
      )}
      {dialog?.kind === 'update' && (
        <KnowledgeFormDialog
          key={dialog.item.id}
          item={dialog.item}
          isSubmitting={isUpdatingKnowledgeDocument}
          error={actionError}
          onClose={closeDialog}
          onSubmit={(values) => void handleUpdate(dialog.item, values)}
        />
      )}
      {dialog?.kind === 'preview' && (
        <KnowledgePreviewDialog item={dialog.item} onClose={closeDialog} />
      )}
      {dialog?.kind === 'delete' && (
        <KnowledgeDeleteDialog
          item={dialog.item}
          isDeleting={isDeletingKnowledgeDocument}
          error={actionError}
          onClose={closeDialog}
          onConfirm={() => void handleDelete(dialog.item)}
        />
      )}
    </PageRoot>
  )
}
