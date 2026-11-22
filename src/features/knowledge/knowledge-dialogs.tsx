import { useId, useRef, type ChangeEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormHelperText,
  TextField,
  Typography,
} from '@mui/material'
import { Upload } from 'lucide-react'
import { FormTextField } from '@/components/form/form-text-field'
import type {
  KnowledgeCategory,
  KnowledgeDocument,
} from '@/api/knowledge/knowledge.schemas'
import { useGetKnowledgeDocument } from '@/api/knowledge/knowledge.queries'
import { displayDate } from '@/features/demo/date-utils'
import { CATEGORIES, MAX_KNOWLEDGE_FILE_BYTES } from './knowledge-constants'
import {
  FormStack,
  FilePicker,
  FileLabel,
  HiddenFileInput,
  MetaList,
  PreviewText,
} from './knowledge-page.styles'

type KnowledgeFormValues = {
  name: string
  category: KnowledgeCategory | ''
  file: File | null
}

export type KnowledgeSubmit = {
  name: string
  category: KnowledgeCategory
  file: File | null
}

type FileError = 'fileRequired' | 'fileType' | 'fileSize' | 'fileEmpty'

const ACCEPTED_EXTENSIONS = ['pdf', 'docx', 'txt']
const ACCEPT_ATTRIBUTE =
  '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

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

const useFormatSize = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'knowledge' })
  return (bytes: number) =>
    bytes >= 1024 * 1024
      ? t('size.mb', { value: (bytes / (1024 * 1024)).toFixed(1) })
      : t('size.kb', { value: Math.max(1, Math.round(bytes / 1024)) })
}

type KnowledgeFormDialogProps = {
  item?: KnowledgeDocument
  isSubmitting: boolean
  error: string
  onClose: () => void
  onSubmit: (values: KnowledgeSubmit) => void
}

export const KnowledgeFormDialog = ({
  item,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: KnowledgeFormDialogProps) => {
  const { t } = useTranslation('translation', { keyPrefix: 'knowledge' })
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
      file: null,
    },
  })

  const submit = handleSubmit((values) => {
    if (!values.category) return
    onSubmit({
      name: values.name.trim(),
      category: values.category,
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
            {!item && (
              <Controller
                control={control}
                name="file"
                rules={{
                  validate: (value) => {
                    const error = validateKnowledgeFile(
                      value instanceof File ? value : null,
                      true,
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
                        {t('form.file')} *
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
                        {t('form.chooseFile')}
                      </Button>
                      <Typography variant="body2">
                        {selected
                          ? t('form.selectedFile', {
                              name: selected.name,
                              size: formatSize(selected.size),
                            })
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
            )}
            {!isUpdate && <Alert severity="info">{t('form.fileCaveat')}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}
          </FormStack>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose} disabled={isSubmitting}>
            {t('form.cancel')}
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {t(isUpdate ? 'form.submitUpdate' : 'form.submitAdd')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

export const KnowledgePreviewDialog = ({
  item,
  onClose,
}: {
  item: KnowledgeDocument
  onClose: () => void
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'knowledge' })
  const titleId = useId()
  const {
    knowledgeDocument,
    isLoadingKnowledgeDocument,
    isKnowledgeDocumentError,
  } = useGetKnowledgeDocument(item.id)
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
          <dd>{item.originalName}</dd>
          <dt>{t('preview.updated')}</dt>
          <dd>{displayDate(item.updatedAt)}</dd>
          <dt>{t('preview.indexStatus')}</dt>
          <dd>
            {t(`indexStatus.${item.indexStatus}`)}
            {item.indexStatus === 'INDEXED' &&
              ` (${t('preview.chunks', { count: item.chunkCount })})`}
          </dd>
        </MetaList>
        {isLoadingKnowledgeDocument && <CircularProgress size={24} />}
        {isKnowledgeDocumentError && (
          <Alert severity="error">{t('errors.previewLoad')}</Alert>
        )}
        {knowledgeDocument &&
          (knowledgeDocument.extractedText ? (
            <PreviewText tabIndex={0} aria-label={t('preview.text')}>
              {knowledgeDocument.extractedText}
            </PreviewText>
          ) : (
            <Alert severity="warning">{t('preview.noText')}</Alert>
          ))}
      </DialogContent>
      <DialogActions>
        <Button type="button" variant="contained" onClick={onClose}>
          {t('preview.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export const KnowledgeDeleteDialog = ({
  item,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: {
  item: KnowledgeDocument
  isDeleting: boolean
  error: string
  onClose: () => void
  onConfirm: () => void
}) => {
  const { t } = useTranslation('translation', { keyPrefix: 'knowledge' })
  const titleId = useId()
  return (
    <Dialog
      open
      onClose={onClose}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id={titleId}>{t('delete.title')}</DialogTitle>
      <DialogContent>
        <Typography>{t('delete.body', { name: item.name })}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button type="button" onClick={onClose} disabled={isDeleting}>
          {t('delete.cancel')}
        </Button>
        <Button
          type="button"
          color="error"
          variant="contained"
          onClick={onConfirm}
          disabled={isDeleting}
        >
          {t('delete.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
