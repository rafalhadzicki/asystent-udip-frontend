import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { Link, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDemoStore } from '@/features/demo/demo-store'
import { validIsoDate } from '@/features/demo/date-utils'
import type {
  CaseItem,
  Redaction,
  RedactionDecision,
} from '@/features/demo/types'
import {
  canExportRedactedText,
  findExactOccurrences,
  hasUnresolvedRedactions,
  overlapsExistingRedaction,
  redactText,
} from './redaction-utils'

const Page = styled('section')(({ theme }) => ({
  width: '100%',
  margin: '0 auto',
  paddingBottom: theme.spacing(3),
}))

const Preview = styled(Paper)(({ theme }) => ({
  minHeight: 180,
  maxHeight: 440,
  overflow: 'auto',
  padding: theme.spacing(2),
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  fontFamily: 'inherit',
  lineHeight: 1.7,
}))

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `redaction-${Date.now()}-${Math.random().toString(36).slice(2)}`

export const RedactionPage = () => {
  const outletCase = useOutletContext<CaseItem>()
  const { cases, updateCase } = useDemoStore()
  const { t } = useTranslation('redaction')
  const item =
    cases.find((current) => current.id === outletCase.id) ?? outletCase
  const completed = item.status === 'completed'
  const responseNeedsSaving =
    item.status === 'waiting' && Boolean(item.responseText)
  const redactions = item.redactions
  const resolved = !hasUnresolvedRedactions(redactions)
  const exportAllowed = canExportRedactedText(
    item.redactionConfirmed,
    redactions,
  )
  const [fragment, setFragment] = useState('')
  const [fragmentError, setFragmentError] = useState('')
  const [analysisMessage, setAnalysisMessage] = useState('')
  const [showOriginal, setShowOriginal] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sentAt, setSentAt] = useState('')
  const [sentNote, setSentNote] = useState('')
  const [sendDateError, setSendDateError] = useState(false)
  const [exportError, setExportError] = useState(false)

  const changeRedactions = (next: Redaction[]) => {
    updateCase(item.id, {
      status: 'redaction',
      redactions: next,
      redactionConfirmed: false,
    })
  }

  const addManualFragment = () => {
    const candidate = fragment
    if (!candidate.trim()) {
      setFragmentError(t('errors.empty'))
      return
    }
    if (item.responseText.indexOf(candidate) === -1) {
      setFragmentError(t('errors.notFound'))
      return
    }
    if (redactions.some((redaction) => redaction.text === candidate)) {
      setFragmentError(t('errors.duplicate'))
      return
    }
    if (overlapsExistingRedaction(item.responseText, candidate, redactions)) {
      setFragmentError(t('errors.overlap'))
      return
    }

    changeRedactions([
      ...redactions,
      {
        id: makeId(),
        text: candidate,
        reason: t('manualReason'),
        decision: 'pending',
      },
    ])
    setFragment('')
    setFragmentError('')
  }

  const runDemoAnalysis = () => {
    const applicant = item.applicant
    const matches = findExactOccurrences(item.responseText, applicant)
    if (matches.length === 0) {
      setAnalysisMessage(t('analysis.noMatch'))
      return
    }
    if (redactions.some((redaction) => redaction.text === applicant)) {
      setAnalysisMessage(t('analysis.alreadyAdded'))
      return
    }
    if (overlapsExistingRedaction(item.responseText, applicant, redactions)) {
      setAnalysisMessage(t('analysis.overlap'))
      return
    }

    changeRedactions([
      ...redactions,
      {
        id: makeId(),
        text: applicant,
        reason: t('analysis.applicantReason'),
        decision: 'pending',
      },
    ])
    setAnalysisMessage(t('analysis.added', { count: matches.length }))
  }

  const decide = (id: string, decision: RedactionDecision) => {
    changeRedactions(
      redactions.map((redaction) =>
        redaction.id === id ? { ...redaction, decision } : redaction,
      ),
    )
  }

  const confirmReview = (checked: boolean) => {
    if (!completed && resolved) {
      updateCase(item.id, {
        status: 'redaction',
        redactionConfirmed: checked,
      })
    }
  }

  const downloadText = () => {
    if (!exportAllowed || !item.responseText) return
    setExportError(false)
    try {
      const blob = new Blob(
        [redactText(item.responseText, redactions, t('replacement'))],
        { type: 'text/plain;charset=utf-8' },
      )
      const url = URL.createObjectURL(blob)
      try {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${item.reference.replaceAll('/', '-')}-zanonimizowana.txt`
        document.body.append(anchor)
        try {
          anchor.click()
        } finally {
          anchor.remove()
        }
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (error) {
      console.error('Cannot export anonymized demo text', error)
      setExportError(true)
    }
  }

  const recordSent = () => {
    if (!validIsoDate(sentAt)) {
      setSendDateError(true)
      return
    }
    updateCase(item.id, {
      status: 'completed',
      sentAt,
      sentNote: sentNote.trim(),
    })
    setSendDialogOpen(false)
  }

  return (
    <Page>
      <Stack spacing={2.5}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            {item.reference}
          </Typography>
          <Typography variant="h2">{t('title')}</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t('subtitle')}
          </Typography>
        </Box>

        <Alert severity="warning">{t('demoWarning')}</Alert>
        {exportError && <Alert severity="error">{t('errors.export')}</Alert>}

        {responseNeedsSaving ? (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Alert severity="warning">{t('waiting.description')}</Alert>
              <Button
                component={Link}
                to={`/sprawy/${encodeURIComponent(item.id)}/materialy`}
                variant="outlined"
                fullWidth
              >
                {t('waiting.goToMaterials')}
              </Button>
            </Stack>
          </Paper>
        ) : !item.responseText ? (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Typography variant="h2">{t('missing.title')}</Typography>
              <Typography color="text.secondary">
                {t('missing.description')}
              </Typography>
              <Button
                component={Link}
                to={`/sprawy/${encodeURIComponent(item.id)}/materialy`}
                variant="outlined"
                fullWidth
              >
                {t('missing.goToMaterials')}
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'minmax(0, 1fr)',
                lg: 'minmax(0, 1.7fr) minmax(300px, 1fr)',
              },
              gridTemplateAreas: {
                xs: '"preview" "analysis" "manual" "decisions" "review"',
                lg: '"preview analysis" "preview manual" "preview decisions" "review review"',
              },
              gap: 2.5,
              alignItems: 'start',
            }}
          >
            <Paper variant="outlined" sx={{ p: 2, gridArea: 'analysis' }}>
              <Stack spacing={1.5}>
                <Typography variant="h2">{t('analysis.title')}</Typography>
                <Typography color="text.secondary">
                  {t('analysis.description')}
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={runDemoAnalysis}
                  disabled={completed}
                >
                  {t('analysis.run')}
                </Button>
                {analysisMessage && (
                  <Alert severity="info" role="status">
                    {analysisMessage}
                  </Alert>
                )}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridArea: 'manual' }}>
              <Stack spacing={1.5}>
                <Typography variant="h2">{t('manual.title')}</Typography>
                <Typography color="text.secondary">
                  {t('manual.description')}
                </Typography>
                <TextField
                  fullWidth
                  label={t('manual.inputLabel')}
                  value={fragment}
                  onChange={(event) => {
                    setFragment(event.target.value)
                    setFragmentError('')
                  }}
                  error={Boolean(fragmentError)}
                  helperText={fragmentError || t('manual.helper')}
                  disabled={completed}
                />
                <Button
                  variant="contained"
                  fullWidth
                  onClick={addManualFragment}
                  disabled={completed || !item.responseText}
                >
                  {t('manual.add')}
                </Button>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridArea: 'decisions' }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="h2">{t('list.title')}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                    {t('list.description')}
                  </Typography>
                </Box>
                {redactions.length === 0 ? (
                  <Alert severity="info">{t('list.empty')}</Alert>
                ) : (
                  <Stack divider={<Divider flexItem />} spacing={2}>
                    {redactions.map((redaction) => (
                      <Stack key={redaction.id} spacing={1}>
                        <Typography
                          component="p"
                          sx={{ overflowWrap: 'anywhere', fontWeight: 600 }}
                        >
                          {redaction.text}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {redaction.reason}
                        </Typography>
                        <Stack spacing={1}>
                          {(['hide', 'keep', 'pending'] as const).map(
                            (decision) => (
                              <Button
                                key={decision}
                                fullWidth
                                size="small"
                                variant={
                                  redaction.decision === decision
                                    ? 'contained'
                                    : 'outlined'
                                }
                                disabled={completed}
                                aria-pressed={redaction.decision === decision}
                                onClick={() => decide(redaction.id, decision)}
                              >
                                {t(`decisions.${decision}`)}
                              </Button>
                            ),
                          )}
                        </Stack>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Stack>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                gridArea: 'preview',
                position: { lg: 'sticky' },
                top: 24,
              }}
            >
              <Stack spacing={1.5}>
                <Stack spacing={1}>
                  <Typography variant="h2">{t('preview.title')}</Typography>
                  <Typography color="text.secondary">
                    {t('preview.description')}
                  </Typography>
                </Stack>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setShowOriginal((value) => !value)}
                >
                  {t(
                    showOriginal
                      ? 'preview.showSanitized'
                      : 'preview.showOriginal',
                  )}
                </Button>
                <Preview variant="outlined" aria-label={t('preview.label')}>
                  {showOriginal
                    ? item.responseText
                    : redactText(
                        item.responseText,
                        redactions,
                        t('replacement'),
                      )}
                </Preview>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, gridArea: 'review' }}>
              <Stack spacing={1.5}>
                <Typography variant="h2">{t('review.title')}</Typography>
                <Typography color="text.secondary">
                  {t(resolved ? 'review.resolved' : 'review.unresolved')}
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={item.redactionConfirmed}
                      disabled={completed || !resolved}
                      onChange={(event) => confirmReview(event.target.checked)}
                    />
                  }
                  label={t('review.confirm')}
                  sx={{ alignItems: 'flex-start', mr: 0 }}
                />
                <Button
                  fullWidth
                  variant="contained"
                  onClick={downloadText}
                  disabled={!exportAllowed || !item.responseText}
                >
                  {t('export')}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {t('review.exportNote')}
                </Typography>
              </Stack>
            </Paper>
          </Box>
        )}

        {completed ? (
          <Alert severity="success">
            {t('sent.recorded', {
              date: item.sentAt,
              note: item.sentNote || t('sent.noNote'),
            })}
          </Alert>
        ) : (
          <Button
            variant="outlined"
            fullWidth
            disabled={
              responseNeedsSaving || !exportAllowed || !item.responseText
            }
            onClick={() => {
              setSentAt('')
              setSentNote('')
              setSendDateError(false)
              setSendDialogOpen(true)
            }}
          >
            {t('sent.openDialog')}
          </Button>
        )}
      </Stack>

      <Dialog
        open={sendDialogOpen}
        onClose={() => setSendDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('sent.dialogTitle')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info">{t('sent.manualOnly')}</Alert>
            <TextField
              fullWidth
              type="date"
              label={t('sent.date')}
              value={sentAt}
              onChange={(event) => {
                setSentAt(event.target.value)
                setSendDateError(false)
              }}
              error={sendDateError}
              helperText={sendDateError ? t('sent.dateRequired') : ' '}
              slotProps={{ inputLabel: { shrink: true } }}
              required
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              label={t('sent.note')}
              value={sentNote}
              onChange={(event) => setSentNote(event.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexDirection: 'column', px: 3, pb: 2, gap: 1 }}>
          <Button fullWidth variant="contained" onClick={recordSent}>
            {t('sent.confirm')}
          </Button>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => setSendDialogOpen(false)}
          >
            {t('sent.cancel')}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}
