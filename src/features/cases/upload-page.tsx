import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { ArrowLeft, ArrowRight, CheckCircle2, FileUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { DEMO_TODAY } from '@/features/demo/demo-data'
import { useDemoStore } from '@/features/demo/demo-store'

const MAX_FILE_SIZE = 25 * 1024 * 1024
const PROCESSING_DELAY = 900
const MIME_TYPES = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const

type UploadError = 'empty' | 'extension' | 'mime' | 'size' | 'multiple'
type UploadState =
  | { status: 'idle' }
  | { status: 'processing'; file: File }
  | { status: 'ready'; file: File }
  | { status: 'error'; error: UploadError }

const Page = styled(Box)(({ theme }) => ({
  maxWidth: 1220,
  margin: '0 auto',
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: { padding: theme.spacing(2) },
}))

const Card = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  border: '1px solid #e4e9ef',
  [theme.breakpoints.down('sm')]: { padding: theme.spacing(2) },
}))

const DropZone = styled(Box)(({ theme }) => ({
  minHeight: 310,
  border: '2px dashed #91a5bd',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: '#f5f7fa',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(3),
  textAlign: 'center',
}))

const IconBox = styled(Box)(({ theme }) => ({
  display: 'grid',
  placeItems: 'center',
  width: 64,
  height: 64,
  color: theme.palette.primary.main,
  background: '#e5ebf1',
  borderRadius: 16,
}))

const HiddenInput = styled('input')({
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

export const UploadPage = () => {
  const { t } = useTranslation('upload')
  const navigate = useNavigate()
  const { setUploadDraft } = useDemoStore()
  const [state, setState] = useState<UploadState>({ status: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setUploadDraft(null)
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [setUploadDraft])

  const clearTimer = () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const reset = () => {
    clearTimer()
    setUploadDraft(null)
    setState({ status: 'idle' })
    if (inputRef.current) inputRef.current.value = ''
  }

  const selectFiles = (files: FileList | File[]) => {
    if (files.length === 0) return
    const selectedFiles = Array.from(files)
    clearTimer()
    setUploadDraft(null)
    if (inputRef.current) inputRef.current.value = ''
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
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setUploadDraft({
        file,
        requestText: t('sampleText'),
        subject: t('sampleSubject'),
        applicant: t('sampleApplicant'),
        receivedAt: DEMO_TODAY,
        writtenAt: DEMO_TODAY,
      })
      setState({ status: 'ready', file })
    }, PROCESSING_DELAY)
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) selectFiles(event.target.files)
  }
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    selectFiles(event.dataTransfer.files)
  }
  const goBack = () => {
    reset()
    navigate('/sprawy')
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
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
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
              onClick={() => navigate('/sprawy/nowy/weryfikacja')}
            >
              {t('continue')}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Page>
  )
}
