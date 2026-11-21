import {
  Alert,
  AlertTitle,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { Eye, FilePen, FileText, Plus, Search, Upload } from 'lucide-react'
import { useId, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormTextField } from '@/components/form/form-text-field'
import { DEMO_TODAY } from '@/features/demo/demo-data'
import { displayDate } from '@/features/demo/date-utils'
import { useDemoStore } from '@/features/demo/demo-store'
import type { KnowledgeItem } from '@/features/demo/types'

type KnowledgeCategory = KnowledgeItem['category']
type CategoryFilter = KnowledgeCategory | 'all'

type KnowledgeFormValues = {
  name: string
  category: KnowledgeCategory | ''
  description: string
  file: File | null
}

type KnowledgeSubmit = {
  name: string
  category: KnowledgeCategory
  description: string
  file: File | null
}

type DialogState =
  | { kind: 'add' }
  | { kind: 'update'; item: KnowledgeItem }
  | { kind: 'preview'; item: KnowledgeItem }
  | null

type FileError = 'fileRequired' | 'fileType' | 'fileSize' | 'fileEmpty'

const CATEGORIES: readonly KnowledgeCategory[] = [
  'law',
  'response',
  'guideline',
]
const ROWS_PER_PAGE_OPTIONS = [5, 10, 25]
const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'txt']
const ACCEPT_ATTRIBUTE =
  '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'
export const MAX_KNOWLEDGE_FILE_BYTES = 25 * 1024 * 1024

const fileExtension = (fileName: string) => {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

const validateKnowledgeFile = (
  file: File | null,
  required: boolean,
): FileError | null => {
  if (!file) return required ? 'fileRequired' : null
  if (!ACCEPTED_EXTENSIONS.includes(fileExtension(file.name))) return 'fileType'
  if (file.size > MAX_KNOWLEDGE_FILE_BYTES) return 'fileSize'
  if (file.size === 0) return 'fileEmpty'
  return null
}

const createKnowledgeId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `knowledge-${crypto.randomUUID()}`
    : `knowledge-${Date.now()}-${Math.random().toString(36).slice(2)}`

const normalize = (value: string) => value.toLocaleLowerCase('pl').trim()

const PageRoot = styled('section')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  width: '100%',
  maxWidth: 1200,
  margin: '0 auto',
  padding: theme.spacing(3, 0),
}))

const PageHeader = styled('header')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
}))

const HeaderText = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  maxWidth: 680,
}))

const HeaderActions = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}))

const Toolbar = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}))

const SearchField = styled(TextField)({
  flex: '1 1 280px',
  maxWidth: 480,
})

const CategoryGroup = styled(ToggleButtonGroup)({
  flexWrap: 'wrap',
})

const CategoryButton = styled(ToggleButton)(({ theme }) => ({
  textTransform: 'none',
  padding: theme.spacing(0.5, 1.5),
  fontWeight: 500,
}))

const ListPanel = styled(Paper)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
}))

const HeaderCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.secondary,
  backgroundColor: theme.palette.background.default,
  whiteSpace: 'nowrap',
}))

const NameCell = styled(TableCell)({
  minWidth: 280,
})

const ItemName = styled(Typography)({
  fontWeight: 600,
})

const ItemDescription = styled(Typography)({
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
})

const FileMeta = styled(Typography)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}))

const CategoryChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'category',
})<{ category: KnowledgeCategory }>(({ theme, category }) => {
  const colors: Record<KnowledgeCategory, string> = {
    law: theme.palette.primary.main,
    response: theme.palette.success.dark,
    guideline: theme.palette.warning.dark,
  }
  return {
    fontWeight: 500,
    color: colors[category],
    borderColor: colors[category],
  }
})

const NoWrapCell = styled(TableCell)({
  whiteSpace: 'nowrap',
})

const ActionsCell = styled(TableCell)(({ theme }) => ({
  whiteSpace: 'nowrap',
  '& > * + *': { marginLeft: theme.spacing(1) },
}))

const EmptyState = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(5, 2),
  textAlign: 'center',
}))

const FormStack = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2.5),
  paddingTop: theme.spacing(1),
}))

const FilePicker = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: theme.spacing(0.75),
}))

const FileLabel = styled('label')(({ theme }) => ({
  ...theme.typography.body2,
  fontWeight: 600,
}))

const HiddenFileInput = styled('input')({
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
})

const MetaList = styled('dl')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(120px, max-content) 1fr',
  gap: theme.spacing(1, 2),
  margin: theme.spacing(2, 0, 0),
  '& dt': { fontWeight: 600, color: theme.palette.text.secondary },
  '& dd': { margin: 0, overflowWrap: 'anywhere' },
}))

const useFormatSize = () => {
  const { t } = useTranslation('knowledge')
  return (bytes: number) =>
    bytes >= 1024 * 1024
      ? t('size.mb', { value: (bytes / (1024 * 1024)).toFixed(1) })
      : t('size.kb', { value: Math.max(1, Math.round(bytes / 1024)) })
}

type KnowledgeFormDialogProps = {
  item?: KnowledgeItem
  onClose: () => void
  onSubmit: (values: KnowledgeSubmit) => void
}

const KnowledgeFormDialog = ({
  item,
  onClose,
  onSubmit,
}: KnowledgeFormDialogProps) => {
  const { t } = useTranslation('knowledge')
  const formatSize = useFormatSize()
  const titleId = useId()
  const fileInputId = useId()
  const fileHelpId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isUpdate = Boolean(item)
  const { control, handleSubmit } = useForm<KnowledgeFormValues>({
    mode: 'onBlur',
    defaultValues: {
      name: item?.name ?? '',
      category: item?.category ?? '',
      description: item?.description ?? '',
      file: null,
    },
  })

  const submit = handleSubmit((values) => {
    if (!values.category) return
    onSubmit({
      name: values.name.trim(),
      category: values.category,
      description: values.description.trim(),
      file: values.file,
    })
  })

  const requiredText = (message: string) => (value: unknown) =>
    (typeof value === 'string' && value.trim() !== '') || message

  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="sm"
    >
      <form noValidate onSubmit={submit}>
        <DialogTitle id={titleId}>
          {t(isUpdate ? 'form.updateTitle' : 'form.addTitle')}
        </DialogTitle>
        <DialogContent>
          <FormStack>
            <FormTextField
              control={control}
              name="name"
              label={t('form.name')}
              required
              rules={{ validate: requiredText(t('errors.nameRequired')) }}
            />
            <Controller
              control={control}
              name="category"
              rules={{
                validate: (value) =>
                  value !== '' || t('errors.categoryRequired'),
              }}
              render={({ field, fieldState }) => (
                <TextField
                  select
                  required
                  label={t('form.category')}
                  name={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message}
                  slotProps={{
                    select: { native: true },
                    inputLabel: { shrink: true },
                  }}
                >
                  <option value="" disabled>
                    {t('form.categoryPlaceholder')}
                  </option>
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {t(`categories.${category}`)}
                    </option>
                  ))}
                </TextField>
              )}
            />
            <FormTextField
              control={control}
              name="description"
              label={t('form.description')}
              helperText={t('form.descriptionHelp')}
              required
              multiline
              minRows={3}
              rules={{
                validate: requiredText(t('errors.descriptionRequired')),
              }}
            />
            <Controller
              control={control}
              name="file"
              rules={{
                validate: (value) => {
                  const error = validateKnowledgeFile(
                    value instanceof File ? value : null,
                    !isUpdate,
                  )
                  return error ? t(`errors.${error}`) : true
                },
              }}
              render={({ field, fieldState }) => {
                const selected =
                  field.value instanceof File ? field.value : null
                const describedBy = fieldState.error
                  ? `${fileHelpId}-error`
                  : fileHelpId
                return (
                  <FilePicker>
                    <FileLabel htmlFor={fileInputId}>
                      {t('form.file')}
                      {isUpdate ? '' : ' *'}
                    </FileLabel>
                    <HiddenFileInput
                      id={fileInputId}
                      ref={fileInputRef}
                      type="file"
                      accept={ACCEPT_ATTRIBUTE}
                      tabIndex={-1}
                      aria-describedby={describedBy}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        field.onChange(event.target.files?.[0] ?? null)
                        event.target.value = ''
                      }}
                    />
                    <Button
                      ref={field.ref}
                      type="button"
                      variant="outlined"
                      color={fieldState.error ? 'error' : 'primary'}
                      startIcon={<Upload size={18} aria-hidden="true" />}
                      aria-describedby={describedBy}
                      onClick={() => fileInputRef.current?.click()}
                      onBlur={field.onBlur}
                    >
                      {t(isUpdate ? 'form.replaceFile' : 'form.chooseFile')}
                    </Button>
                    <Typography variant="body2">
                      {selected
                        ? t('form.selectedFile', {
                            name: selected.name,
                            size: formatSize(selected.size),
                          })
                        : item
                          ? t('form.currentFile', { name: item.fileName })
                          : t('form.noFile')}
                    </Typography>
                    {fieldState.error ? (
                      <FormHelperText
                        id={`${fileHelpId}-error`}
                        error
                        role="alert"
                      >
                        {fieldState.error.message}
                      </FormHelperText>
                    ) : (
                      <FormHelperText id={fileHelpId}>
                        {t('form.fileHelp')}
                      </FormHelperText>
                    )}
                  </FilePicker>
                )
              }}
            />
            <Alert severity="info">
              {t(isUpdate ? 'form.updateCaveat' : 'form.fileCaveat')}
            </Alert>
            {isUpdate && <Alert severity="info">{t('form.fileCaveat')}</Alert>}
          </FormStack>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose}>
            {t('form.cancel')}
          </Button>
          <Button type="submit" variant="contained">
            {t(isUpdate ? 'form.submitUpdate' : 'form.submitAdd')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

const KnowledgePreviewDialog = ({
  item,
  onClose,
}: {
  item: KnowledgeItem
  onClose: () => void
}) => {
  const { t } = useTranslation('knowledge')
  const titleId = useId()
  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle id={titleId}>{t('preview.title')}</DialogTitle>
      <DialogContent>
        <Typography variant="h6" component="p">
          {item.name}
        </Typography>
        <MetaList>
          <dt>{t('preview.category')}</dt>
          <dd>{t(`categories.${item.category}`)}</dd>
          <dt>{t('preview.fileName')}</dt>
          <dd>{item.fileName}</dd>
          <dt>{t('preview.updated')}</dt>
          <dd>{displayDate(item.updatedAt)}</dd>
          <dt>{t('preview.description')}</dt>
          <dd>{item.description}</dd>
        </MetaList>
        <Alert severity="warning">{t('preview.caveat')}</Alert>
      </DialogContent>
      <DialogActions>
        <Button type="button" variant="contained" onClick={onClose}>
          {t('preview.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export const KnowledgePage = () => {
  const { t } = useTranslation('knowledge')
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
