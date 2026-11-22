import {
  Page,
  Card,
  DropZone,
  IconBox,
  HiddenInput,
} from './upload-page.styles'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material'
import { ArrowLeft, ArrowRight, CheckCircle2, FileUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useDemoStore } from '@/features/demo/demo-store'
import { routes } from '@/app/routes'
import { useAnalyzeRequest } from '@/api/cases/cases.queries'
import { getApiErrorKind } from '@/api/errors'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const MIME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const

type UploadError =
  | 'empty'
  | 'extension'
  | 'mime'
  | 'size'
  | 'multiple'
  | 'unauthorized'
  | 'serverSize'
  | 'serverFormat'
  | 'request'
type UploadState =
  | { status: 'idle' }
  | { status: 'processing'; file: File }
  | { status: 'ready'; file: File }
  | { status: 'error'; error: UploadError }

const validateFile = (file: File): UploadError | null => {
  if (file.size === 0) return 'empty'
  const extension = file.name.split('.').pop()?.toLowerCase()
  if (!file.name.includes('.') || (extension !== 'pdf' && extension !== 'docx'))
    return 'extension'
  if (file.type && file.type.toLowerCase() !== MIME_TYPES[extension])
    return 'mime'
  if (file.size > MAX_FILE_SIZE) return 'size'
  return null
}

const toUploadError = (error: unknown): UploadError => {
  switch (getApiErrorKind(error)) {
    case 'unauthorized':
      return 'unauthorized'
    case 'tooLarge':
      return 'serverSize'
    case 'unsupported':
      return 'serverFormat'
    default:
      return 'request'
  }
}

export const UploadPage = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'upload' })
  const navigate = useNavigate()
  const { setUploadDraft } = useDemoStore()
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const { analyzeRequest, cancelAnalyzeRequest } = useAnalyzeRequest()

  useEffect(() => {
    setUploadDraft(null)
  }, [setUploadDraft])

  const reset = () => {
    cancelAnalyzeRequest()
    setUploadDraft(null)
    setState({ status: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  const selectFiles = (files: FileList | File[]) => {
    if (files.length === 0) return
    const selectedFiles = Array.from(files)
    reset()
    if (selectedFiles.length !== 1) {
      setState({ status: 'error', error: 'multiple' })
      return
    }
    const file = selectedFiles[0]
    const error = validateFile(file)
    if (error) {
      setState({ status: 'error', error })
      return
    }
    setState({ status: 'processing', file })
    analyzeRequest(file, {
      onSuccess: (result) => {
        setUploadDraft({
          file,
          requestText: result.extractedText ?? '',
          reference: result.suggestions.caseNumber?.value ?? '',
          subject: result.suggestions.subject?.value ?? '',
          applicant: result.suggestions.requesterName?.value ?? '',
          applicantEmail: result.suggestions.requesterEmail?.value ?? '',
          applicantAddress: result.suggestions.requesterAddress?.value ?? '',
          receivedAt: result.suggestions.receivedAt?.value ?? '',
          writtenAt: result.suggestions.writtenAt?.value ?? '',
          questions: result.questions.map(({ text, departmentIds }) => ({
            text,
            departmentId: departmentIds[0],
          })),
          departments: result.departments.map(
            ({ departmentId, name, reason }) => ({
              id: departmentId,
              name,
              reason,
            }),
          ),
          aiStatus: result.ai.status,
          warnings: result.warnings,
          textExtractionStatus: result.textExtractionStatus,
        })
        setState({ status: 'ready', file })
      },
      onError: (requestError) =>
        setState({ status: 'error', error: toUploadError(requestError) }),
    })
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) selectFiles(event.target.files)
  }
  const goBack = () => {
    reset()
    navigate(routes.cases)
  }

  return (
    <Page>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Button startIcon={<ArrowLeft aria-hidden="true" />} onClick={goBack}>
          {t('back')}
        </Button>
        <Typography variant="body2" color="text.secondary">
          <strong>{t('step')}</strong> → {t('nextStep')}
        </Typography>
      </Stack>
      <Typography variant="h1" component="h1" gutterBottom>
        {t('title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {t('description')}
      </Typography>
      <Card elevation={0}>
        <DropZone
          onFiles={selectFiles}
          aria-busy={state.status === 'processing'}
        >
          <HiddenInput
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleChange}
            tabIndex={-1}
            aria-label={t('choose')}
          />
          {state.status === 'processing' ? (
            <>
              <CircularProgress aria-label={t('processing')} />
              <Typography role="status">{t('processing')}</Typography>
              <Typography>{state.file.name}</Typography>
              <Button onClick={reset}>{t('remove')}</Button>
            </>
          ) : state.status === 'ready' ? (
            <>
              <IconBox>
                <CheckCircle2 aria-hidden="true" />
              </IconBox>
              <Typography variant="h6" role="status">
                {t('ready')}
              </Typography>
              <Typography sx={{ overflowWrap: 'anywhere' }}>
                {state.file.name}
              </Typography>
              <Typography color="text.secondary">
                {t('size', {
                  size: new Intl.NumberFormat('pl-PL').format(state.file.size),
                })}
              </Typography>
              <Stack
                direction="row"
                sx={{ gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}
              >
                <Button
                  variant="outlined"
                  onClick={() => inputRef.current?.click()}
                >
                  {t('replace')}
                </Button>
                <Button onClick={reset}>{t('remove')}</Button>
              </Stack>
            </>
          ) : (
            <>
              <IconBox>
                <FileUp aria-hidden="true" />
              </IconBox>
              <Typography variant="h6">{t('dropTitle')}</Typography>
              <Typography color="text.secondary">
                {t('dropDescription')}
              </Typography>
              {state.status === 'error' && (
                <Alert severity="error">{t(`errors.${state.error}`)}</Alert>
              )}
              <Button
                variant="outlined"
                onClick={() => inputRef.current?.click()}
              >
                {t(state.status === 'error' ? 'retry' : 'choose')}
              </Button>
              <Typography variant="body2" color="text.secondary">
                {t('formats')}
              </Typography>
            </>
          )}
        </DropZone>
        <Alert severity="info" role="note" sx={{ mt: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>{t('demoTitle')}</Typography>
          <Typography variant="body2">{t('demoNotice')}</Typography>
        </Alert>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{
            justifyContent: 'space-between',
            alignItems: { sm: 'center' },
            gap: 2,
            mt: 3,
          }}
        >
          <Button onClick={goBack}>{t('cancel')}</Button>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ alignItems: { sm: 'center' }, gap: 2 }}
          >
            {state.status !== 'ready' && (
              <Typography variant="body2" color="text.secondary">
                {t('continueHint')}
              </Typography>
            )}
            <Button
              variant="contained"
              endIcon={<ArrowRight aria-hidden="true" />}
              disabled={state.status !== 'ready'}
              onClick={() => navigate(routes.verification)}
            >
              {t('continue')}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Page>
  )
}
