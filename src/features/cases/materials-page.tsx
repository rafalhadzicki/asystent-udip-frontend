import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import { useTranslation } from 'react-i18next'
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
import { styled } from '@mui/material/styles'
import { useDemoStore } from '@/features/demo/demo-store'
import type { CaseItem, DocumentMeta } from '@/features/demo/types'
import { DEMO_TODAY } from '@/features/demo/demo-data'
import { validIsoDate } from '@/features/demo/date-utils'

const Layout = styled('section')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}))

const Columns = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
  gap: theme.spacing(3),
  alignItems: 'start',
  [theme.breakpoints.down('md')]: { gridTemplateColumns: 'minmax(0, 1fr)' },
}))

const Card = styled('section')(({ theme }) => ({
  background: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
}))

const MaterialItem = styled('li')(({ theme }) => ({
  listStyle: 'none',
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  background: theme.palette.background.default,
  overflowWrap: 'anywhere',
}))

const today = () => DEMO_TODAY

const maxFileSize = 25 * 1024 * 1024
const fileTypes: Record<string, string[]> = {
  pdf: ['application/pdf'],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  txt: ['text/plain'],
}

export const MaterialsPage = () => {
  const item = useOutletContext<CaseItem>()
  const { updateCase, storageError } = useDemoStore()
  const { t } = useTranslation('materials')
  const [unit, setUnit] = useState('')
  const [contactDate, setContactDate] = useState(item.contactedAt || today())
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const [editorCaseId, setEditorCaseId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
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
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const cancelGeneration = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
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

  const markContacted = () => {
    if (!selectedDepartments.length || !validIsoDate(contactDate)) {
      setError(t('contactError'))
      return
    }
    setError('')
    invalidate({ contactedAt: contactDate })
  }

  const addFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!selectedDepartments.some((department) => department.name === unit)) {
      setError(t('fileUnitError'))
      return
    }
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    if (
      !fileTypes[extension] ||
      (file.type && !fileTypes[extension].includes(file.type))
    ) {
      setError(t('fileTypeError'))
      return
    }
    if (file.size > maxFileSize) {
      setError(t('fileSizeError'))
      return
    }
    if (!file.size) {
      setError(t('fileEmptyError'))
      return
    }
    const material: DocumentMeta = {
      id: crypto.randomUUID(),
      name: file.name,
      size: file.size,
      unit,
      addedAt: today(),
    }
    setError('')
    invalidate({ materials: [...item.materials, material] })
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

  const generate = () => {
    if (!item.materialNotes.trim()) {
      setError(t('notesRequired'))
      return
    }
    setError('')
    setConfirmReplace(false)
    setSaved(false)
    setGenerating(true)
    const signature = inputSignature
    const response = [
      t('draftHeading'),
      t('draftGreeting', { applicant: item.applicant }),
      `${t('draftQuestions')}\n${item.questions
        .filter((question) => question.selected)
        .map((question) => `• ${question.text}`)
        .join('\n')}`,
      `${t('draftMaterials')}\n${item.materialNotes.trim()}`,
      t('draftReview'),
    ].join('\n\n')
    timer.current = setTimeout(() => {
      timer.current = null
      setGenerating(false)
      if (latestSignature.current !== signature) return
      setEditorCaseId(item.id)
      updateCase(item.id, {
        responseText: response,
        status: 'draft',
        redactions: [],
        redactionConfirmed: false,
      })
    }, 800)
  }

  const saveResponse = () => {
    if (!item.responseText.trim()) return
    cancelGeneration()
    updateCase(item.id, { status: 'draft' })
    setSaved(true)
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
      <Card>
        <Stack spacing={2}>
          <Typography variant="h6" component="h3">
            {t('departments')}
          </Typography>
          {selectedDepartments.length ? (
            <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
              {selectedDepartments.map((department) => (
                <Chip key={department.id} label={department.name} />
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary">{t('noDepartments')}</Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {t('contactInfo')}
          </Typography>
          {item.contactedAt && (
            <Typography variant="body2">
              {t('contacted', { date: item.contactedAt })}
            </Typography>
          )}
          {!completed && (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              sx={{ alignItems: { sm: 'center' } }}
            >
              <TextField
                type="date"
                label={t('contactDate')}
                value={contactDate}
                onChange={(event) => setContactDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ maxWidth: { sm: 240 } }}
              />
              <Button variant="outlined" onClick={markContacted}>
                {t('markSent')}
              </Button>
            </Stack>
          )}
        </Stack>
      </Card>
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
              <Alert severity="info">{t('demoNotice')}</Alert>
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
              {!completed && (
                <>
                  {confirmReplace && (
                    <Alert severity="warning">
                      <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
                        <Typography>{t('replacePrompt')}</Typography>
                        <Stack direction="row" spacing={1}>
                          <Button onClick={generate}>
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
                        item.responseText ? setConfirmReplace(true) : generate()
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
                          aria-label={t('removeFile', { name: material.name })}
                          onClick={() =>
                            invalidate({
                              materials: item.materials.filter(
                                (entry) => entry.id !== material.id,
                              ),
                            })
                          }
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
                      <MenuItem key={department.id} value={department.name}>
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
                      onChange={addFile}
                    />
                  </Button>
                </>
              )}
            </Stack>
          </Card>
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
          {item.responseText.trim() && !stale && !generating ? (
            <Button
              component={Link}
              to={`/sprawy/${encodeURIComponent(item.id)}/anonimizacja`}
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
      </Card>
    </Layout>
  )
}
