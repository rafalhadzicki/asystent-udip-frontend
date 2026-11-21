import {
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
  InputAdornment,
  Table,
  TableBody,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from '@mui/material'
import { Eye, FilePen, FileText, Plus, Search } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEMO_TODAY } from '@/features/demo/demo-data'
import { displayDate } from '@/features/demo/date-utils'
import { useDemoStore } from '@/features/demo/demo-store'
import type { KnowledgeItem } from '@/features/demo/types'

type KnowledgeCategory = KnowledgeItem['category']
type CategoryFilter = KnowledgeCategory | 'all'

type DialogState =
  | { kind: 'add' }
  | { kind: 'update'; item: KnowledgeItem }
  | { kind: 'preview'; item: KnowledgeItem }
  | null

const ROWS_PER_PAGE_OPTIONS = [5, 10, 25]
const createKnowledgeId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `knowledge-${crypto.randomUUID()}`
    : `knowledge-${Date.now()}-${Math.random().toString(36).slice(2)}`

const normalize = (value: string) => value.toLocaleLowerCase('pl').trim()

export const KnowledgePage = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'knowledge' })
  const { knowledge, addKnowledge, updateKnowledge } = useDemoStore()
  const titleId = useId()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0])
  const [dialog, setDialog] = useState<DialogState>(null)
  const [feedback, setFeedback] = useState('')

  const ordered = useMemo(
    () =>
      [...knowledge]
        .reverse()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [knowledge],
  )

  const searched = useMemo(() => {
    const needle = normalize(query)
    if (!needle) return ordered
    return ordered.filter((item) =>
      [item.name, item.description, item.fileName].some((value) =>
        normalize(value).includes(needle),
      ),
    )
  }, [ordered, query])

  const filtered =
    category === 'all'
      ? searched
      : searched.filter((item) => item.category === category)
  const lastPage = Math.max(0, Math.ceil(filtered.length / rowsPerPage) - 1)
  const currentPage = Math.min(page, lastPage)
  const visible = filtered.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage,
  )

  const countFor = (value: CategoryFilter) =>
    value === 'all'
      ? searched.length
      : searched.filter((item) => item.category === value).length

  const closeDialog = () => setDialog(null)

  const handleAdd = (values: KnowledgeSubmit) => {
    if (!values.file) return
    addKnowledge({
      id: createKnowledgeId(),
      name: values.name,
      category: values.category,
      description: values.description,
      updatedAt: DEMO_TODAY,
      fileName: values.file.name,
    })
    setFeedback(t('feedback.added', { name: values.name }))
    setPage(0)
    closeDialog()
  }

  const handleUpdate = (item: KnowledgeItem, values: KnowledgeSubmit) => {
    updateKnowledge(item.id, {
      name: values.name,
      category: values.category,
      description: values.description,
      updatedAt: DEMO_TODAY,
      fileName: values.file?.name ?? item.fileName,
    })
    setFeedback(t('feedback.updated', { name: values.name }))
    closeDialog()
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
            {t('summary', { count: knowledge.length })}
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
        <AlertTitle>{t('demoNotice.title')}</AlertTitle>
        {t('demoNotice.body')}
      </Alert>

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
              setQuery(event.target.value)
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
                {t('filters.withCount', {
                  label:
                    value === 'all'
                      ? t('filters.all')
                      : t(`categories.${value}`),
                  count: countFor(value),
                })}
              </CategoryButton>
            ))}
          </CategoryGroup>
        </Toolbar>

        {filtered.length === 0 ? (
          <EmptyState>
            <Typography color="text.secondary">{t('table.empty')}</Typography>
            <Button type="button" onClick={clearFilters}>
              {t('table.clearFilters')}
            </Button>
          </EmptyState>
        ) : (
          <>
            <TableContainer>
              <Table size="small" aria-label={t('table.label')}>
                <TableHead>
                  <TableRow>
                    <HeaderCell>{t('table.name')}</HeaderCell>
                    <HeaderCell>{t('table.category')}</HeaderCell>
                    <HeaderCell>{t('table.updated')}</HeaderCell>
                    <HeaderCell align="right">{t('table.actions')}</HeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.map((item) => (
                    <TableRow key={item.id} hover>
                      <NameCell>
                        <ItemName variant="body2">{item.name}</ItemName>
                        <ItemDescription variant="body2" color="text.secondary">
                          {item.description}
                        </ItemDescription>
                        <FileMeta variant="caption">
                          <FileText size={14} aria-hidden="true" />
                          {t('table.file', { name: item.fileName })}
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
                      </ActionsCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={filtered.length}
              page={currentPage}
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
        <KnowledgeFormDialog onClose={closeDialog} onSubmit={handleAdd} />
      )}
      {dialog?.kind === 'update' && (
        <KnowledgeFormDialog
          key={dialog.item.id}
          item={dialog.item}
          onClose={closeDialog}
          onSubmit={(values) => handleUpdate(dialog.item, values)}
        />
      )}
      {dialog?.kind === 'preview' && (
        <KnowledgePreviewDialog item={dialog.item} onClose={closeDialog} />
      )}
    </PageRoot>
  )
}
