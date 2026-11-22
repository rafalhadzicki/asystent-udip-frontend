import { Layout, Columns, MaterialItem } from './materials-page.styles'
import { FileDropArea } from '@/components/ui/file-drop-area'
import { SectionCard as Card } from '@/components/ui/section-card'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
import { StepBackButton } from '../step-back-button'
import { Link, useOutletContext } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useLocalStore } from '@/features/cases/local-store'
import type { CaseItem } from '@/features/cases/types'
import { caseTabs, routes } from '@/app/routes'
import {
  useDeleteCaseDocument,
  useDraftResponse,
  useUploadCaseDocument,
} from '@/api/cases/cases.queries'
import type { DraftResponse } from '@/api/cases/cases.schemas'
import { getApiErrorKind } from '@/api/errors'
import { useAiErrorMessage } from '../use-ai-error-message'
import { validateMaterialFile } from './materials-utils'

const fileErrorKeys = {
  type: 'fileTypeError',
  size: 'fileSizeError',
  empty: 'fileEmptyError',
} as const

export const MaterialsPage = () => {
  const item = useOutletContext<CaseItem>()
  const { updateCase, storageError } = useLocalStore()
  const { t } = useTranslation('translation', { keyPrefix: 'materials' })
  const [unit, setUnit] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sources, setSources] = useState<DraftResponse['sources']>([])
  const { uploadCaseDocumentAsync, isUploadingCaseDocument } =
    useUploadCaseDocument()
  const { deleteCaseDocumentAsync } = useDeleteCaseDocument()
  const { draftResponseAsync } = useDraftResponse()
  const toAiErrorMessage = useAiErrorMessage()
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [editorCaseId, setEditorCaseId] = useState<string | null>(null)
  // Identifies the running generation; a cancelled or outdated one is ignored.
  const generationId = useRef(0)
  const selectedDepartments = item.departments.filter(
    (department) => department.selected,
  )
  const completed = item.status === 'completed'
  const stale = item.status === 'waiting' && !!item.responseText
  const inputSignature = JSON.stringify([
    item.id,
    item.status,
    item.applicant,
    item.questions,
    item.departments,
    item.materials,
    item.materialNotes,
    item.responseText,
  ])
  const latestSignature = useRef(inputSignature)
  useLayoutEffect(() => {
    latestSignature.current = inputSignature
  }, [inputSignature])

  useEffect(
    () => () => {
      generationId.current += 1
    },
    [],
  )

  const cancelGeneration = () => {
    generationId.current += 1
    setGenerating(false)
    setConfirmReplace(false)
  }

  const invalidate = (changes: Partial<CaseItem>) => {
    cancelGeneration()
    setSaved(false)
    updateCase(item.id, {
      ...changes,
      status: 'waiting',
      redactions: [],
      redactionConfirmed: false,
    })
  }

  const addFile = async (file: File | undefined) => {
    if (!file) return
    if (!selectedDepartments.some((department) => department.id === unit)) {
      setError(t('fileUnitError'))
      return
    }
    const fileError = validateMaterialFile(file)
    if (fileError) {
      setError(t(fileErrorKeys[fileError]))
      return
    }
    try {
      await uploadCaseDocumentAsync({
        caseId: item.id,
        file,
        kind: 'DEPARTMENT_RESPONSE',
        departmentId: unit,
      })
    } catch (uploadError) {
      const kind = getApiErrorKind(uploadError)
      setError(
        t(
          kind === 'tooLarge'
            ? 'fileSizeError'
            : kind === 'unsupported'
              ? 'fileTypeError'
              : 'uploadError',
        ),
      )
      return
    }
    setError('')
    invalidate({})
  }

  const removeFile = async (documentId: string) => {
    try {
      await deleteCaseDocumentAsync({ caseId: item.id, documentId })
    } catch {
      setError(t('deleteError'))
      return
    }
    setError('')
    invalidate({})
  }

  const changeResponse = (responseText: string) => {
    cancelGeneration()
    setSaved(false)
    setEditorCaseId(item.id)
    updateCase(item.id, {
      responseText,
      status: item.status === 'waiting' ? 'waiting' : 'draft',
      redactions: [],
      redactionConfirmed: false,
    })
  }

  const generate = async () => {
    const notes = item.materialNotes.trim()
    if (!notes && item.materials.length === 0) {
      setError(t('notesRequired'))
      return
    }
    setError('')
    setConfirmReplace(false)
    setSaved(false)
    setGenerating(true)
    generationId.current += 1
    const requestId = generationId.current
    const signature = inputSignature
    try {
      const draft = await draftResponseAsync({ id: item.id, notes })
      if (
        requestId !== generationId.current ||
        latestSignature.current !== signature
      )
        return
      setSources(draft.sources)
      setEditorCaseId(item.id)
      updateCase(item.id, {
        responseText: draft.text,
        status: 'draft',
        redactions: [],
        redactionConfirmed: false,
      })
    } catch (generateError) {
      if (requestId === generationId.current)
        setError(toAiErrorMessage(generateError, t('generateError')))
    } finally {
      if (requestId === generationId.current) setGenerating(false)
    }
  }

  const saveResponse = () => {
    if (!item.responseText.trim()) return
    cancelGeneration()
    updateCase(item.id, { status: 'draft' })
    setSaved(true)
  }

  if (item.analysisNeedsReview) {
    return (
      <Alert severity="warning">
        {t('analysisReviewRequired')}{' '}
        <Link to={routes.caseTab(item.id, caseTabs.analysis)}>
          {t('goToAnalysis')}
        </Link>
      </Alert>
    )
  }

  return (
    <Layout>
      <Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          {t('title')}
        </Typography>
        <Typography color="text.secondary">{t('subtitle')}</Typography>
      </Box>
      {completed && <Alert severity="info">{t('completed')}</Alert>}
      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {storageError === 'save' && (
        <Alert severity="error">{t('saveError')}</Alert>
      )}
      <Columns>
        <Stack spacing={3}>
          <Card>
            <Stack spacing={2}>
              <Stack
                direction="row"
                sx={{
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
                }}
              >
                <Typography variant="h6" component="h3">
                  {t('editor')}
                </Typography>
                <Chip
                  size="small"
                  label={
                    item.materials.length || item.materialNotes.trim()
                      ? t('received')
                      : t('awaiting')
                  }
                />
              </Stack>
              {stale && <Alert severity="warning">{t('stale')}</Alert>}
              {!item.responseText && (
                <Typography color="text.secondary">
                  {t('emptyResponse')}
                </Typography>
              )}
              <TextField
                label={t('responseLabel')}
                multiline
                minRows={18}
                value={item.responseText}
                onChange={(event) => changeResponse(event.target.value)}
                slotProps={{
                  input: {
                    readOnly:
                      completed ||
                      (!item.responseText && editorCaseId !== item.id),
                  },
                }}
              />
              {sources.length > 0 && (
                <Stack
                  spacing={1}
                  component="section"
                  aria-label={t('sources')}
                >
                  <Typography variant="subtitle2">{t('sources')}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('sourcesHelp')}
                  </Typography>
                  {sources.map((source, index) => (
                    <MaterialItem key={`${source.documentId}-${index}`}>
                      <Typography sx={{ fontWeight: 600 }}>
                        {source.documentName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {source.kind === 'KNOWLEDGE' && source.category
                          ? t(`sourceCategory.${source.category}`)
                          : t('sourceCase', {
                              unit: source.departmentSymbol ?? '—',
                            })}
                      </Typography>
                      <Typography variant="body2">
                        “{source.excerpt}”
                      </Typography>
                    </MaterialItem>
                  ))}
                </Stack>
              )}
              {!completed && (
                <>
                  {confirmReplace && (
                    <Alert severity="warning">
                      <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <Typography>{t('replacePrompt')}</Typography>
                        <Stack direction="row" spacing={1}>
                          <Button onClick={() => void generate()}>
                            {t('replaceConfirm')}
                          </Button>
                          <Button onClick={() => setConfirmReplace(false)}>
                            {t('cancel')}
                          </Button>
                        </Stack>
                      </Stack>
                    </Alert>
                  )}
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    sx={{ flexWrap: 'wrap' }}
                  >
                    <Button
                      variant="contained"
                      disabled={generating}
                      onClick={() =>
                        item.responseText
                          ? setConfirmReplace(true)
                          : void generate()
                      }
                    >
                      {generating ? (
                        <>
                          <CircularProgress
                            size={18}
                            color="inherit"
                            sx={{ mr: 1 }}
                          />
                          {t('generating')}
                        </>
                      ) : (
                        t('generate')
                      )}
                    </Button>
                    {generating && (
                      <Button onClick={cancelGeneration}>{t('cancel')}</Button>
                    )}
                    <Button
                      variant="outlined"
                      disabled={!item.responseText.trim() || generating}
                      onClick={saveResponse}
                    >
                      {t('save')}
                    </Button>
                  </Stack>
                  {saved && <Alert severity="success">{t('saved')}</Alert>}
                </>
              )}
            </Stack>
          </Card>
        </Stack>
        <Stack spacing={3}>
          <FileDropArea
            onFiles={([file]) => void addFile(file)}
            disabled={completed || isUploadingCaseDocument}
          >
            <Card>
              <Stack spacing={2}>
                <Typography variant="h6" component="h3">
                  {t('materials')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('fileHelp')}
                </Typography>
                {item.materials.length ? (
                  <Stack component="ul" spacing={1} sx={{ p: 0, m: 0 }}>
                    {item.materials.map((material) => (
                      <MaterialItem key={material.id}>
                        <Typography sx={{ fontWeight: 600 }}>
                          {material.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {material.unit} · {material.addedAt} ·{' '}
                          {Math.ceil(material.size / 1024)} KB
                        </Typography>
                        {!completed && (
                          <Button
                            size="small"
                            aria-label={t('removeFile', {
                              name: material.name,
                            })}
                            onClick={() => void removeFile(material.id)}
                          >
                            {t('removeFile', { name: material.name })}
                          </Button>
                        )}
                      </MaterialItem>
                    ))}
                  </Stack>
                ) : (
                  <Typography color="text.secondary">
                    {t('noMaterials')}
                  </Typography>
                )}
                {!completed && (
                  <>
                    <TextField
                      select
                      label={t('unit')}
                      value={unit}
                      onChange={(event) => setUnit(event.target.value)}
                    >
                      <MenuItem value="">
                        <em>{t('chooseUnit')}</em>
                      </MenuItem>
                      {selectedDepartments.map((department) => (
                        <MenuItem key={department.id} value={department.id}>
                          {department.name}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Button component="label" variant="outlined">
                      {t('addFile')}
                      <input
                        type="file"
                        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        hidden
                        disabled={isUploadingCaseDocument}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          const [file] = event.target.files ?? []
                          event.target.value = ''
                          void addFile(file)
                        }}
                      />
                    </Button>
                  </>
                )}
              </Stack>
            </Card>
          </FileDropArea>
          <Card>
            <Stack spacing={2}>
              <Typography variant="h6" component="h3">
                {t('notes')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('notesHelp')}
              </Typography>
              <TextField
                label={t('notes')}
                multiline
                minRows={8}
                value={item.materialNotes}
                onChange={(event) =>
                  invalidate({ materialNotes: event.target.value })
                }
                slotProps={{ input: { readOnly: completed } }}
              />
            </Stack>
          </Card>
        </Stack>
      </Columns>
      <Card>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            justifyContent: 'space-between',
            gap: 2,
            alignItems: { sm: 'center' },
          }}
        >
          <Typography variant="body2" color="text.secondary">
            {t('nextHelp')}
          </Typography>
          <Stack direction="row" sx={{ gap: 1, flexShrink: 0 }}>
            <StepBackButton to={routes.caseTab(item.id, caseTabs.analysis)} />
            {item.responseText.trim() && !stale && !generating ? (
              <Button
                component={Link}
                to={routes.caseTab(item.id, caseTabs.redaction)}
                variant="contained"
              >
                {t('next')}
              </Button>
            ) : (
              <Button variant="contained" disabled>
                {t('next')}
              </Button>
            )}
          </Stack>
        </Stack>
      </Card>
    </Layout>
  )
}
