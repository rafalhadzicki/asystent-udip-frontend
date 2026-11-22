import { Grid, Page } from './redaction-page.styles'
import { ManualFragmentForm } from './manual-fragment-form'
import { RedactionList } from './redaction-list'
import { RedactionPreview } from './redaction-preview'
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
  FormControlLabel,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { Link, useOutletContext } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useChangeCaseStatus,
  useRedactionSuggestions,
} from '@/api/cases/cases.queries'
import type { RedactionSuggestion } from '@/api/cases/cases.schemas'
import { useAiErrorMessage } from '../use-ai-error-message'
import { StepBackButton } from '../step-back-button'
import { useLocalStore } from '@/features/cases/local-store'
import { validIsoDate } from '@/features/cases/date-utils'
import type {
  CaseItem,
  Redaction,
  RedactionDecision,
} from '@/features/cases/types'
import { caseTabs, routes } from '@/app/routes'
import {
  buildExportBlob,
  downloadBlob,
  exportFormats,
  type ExportFormat,
} from './redaction-export'
import {
  canExportRedactedText,
  hasUnresolvedRedactions,
  overlapsExistingRedaction,
  redactText,
} from './redaction-utils'

const makeId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `redaction-${Date.now()}-${Math.random().toString(36).slice(2)}`

export const RedactionPage = () => {
  const item = useOutletContext<CaseItem>()
  const { updateCase } = useLocalStore()
  const { t } = useTranslation('translation', { keyPrefix: 'redaction' })
  const completed = item.status === 'completed'
  const responseNeedsSaving =
    item.status === 'waiting' && Boolean(item.responseText)
  const redactions = item.redactions
  const resolved = !hasUnresolvedRedactions(redactions)
  const exportAllowed = canExportRedactedText(
    item.redactionConfirmed,
    redactions,
  )
  const [analysisMessage, setAnalysisMessage] = useState('')
  const [analysisError, setAnalysisError] = useState('')
  const { getRedactionSuggestionsAsync, isGettingRedactionSuggestions } =
    useRedactionSuggestions()
  const toAiErrorMessage = useAiErrorMessage()
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sentAt, setSentAt] = useState('')
  const [sentNote, setSentNote] = useState('')
  const [sendDateError, setSendDateError] = useState(false)
  const [sendError, setSendError] = useState(false)
  const { changeCaseStatusAsync, isChangingCaseStatus } = useChangeCaseStatus()
  const [exportError, setExportError] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('txt')

  const changeRedactions = (next: Redaction[]) => {
    updateCase(item.id, {
      status: 'redaction',
      redactions: next,
      redactionConfirmed: false,
    })
  }

  const addManualFragment = (candidate: string): string | null => {
    if (!candidate.trim()) {
      return t('errors.empty')
    }
    if (item.responseText.indexOf(candidate) === -1) {
      return t('errors.notFound')
    }
    if (redactions.some((redaction) => redaction.text === candidate)) {
      return t('errors.duplicate')
    }
    if (overlapsExistingRedaction(item.responseText, candidate, redactions)) {
      return t('errors.overlap')
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
    return null
  }

  const runAnalysis = async () => {
    setAnalysisMessage('')
    setAnalysisError('')
    let suggestions: RedactionSuggestion[]
    try {
      suggestions = await getRedactionSuggestionsAsync({
        id: item.id,
        text: item.responseText,
      })
    } catch (error) {
      setAnalysisError(toAiErrorMessage(error, t('analysis.error')))
      return
    }
    const added: Redaction[] = []
    let skipped = 0
    for (const { text, category, reason } of suggestions) {
      if (
        item.responseText.indexOf(text) === -1 ||
        redactions.some((redaction) => redaction.text === text) ||
        added.some((redaction) => redaction.text === text) ||
        overlapsExistingRedaction(item.responseText, text, [
          ...redactions,
          ...added,
        ])
      ) {
        skipped += 1
        continue
      }
      added.push({
        id: makeId(),
        text,
        reason: `${t(`analysis.categories.${category}`)}: ${reason}`,
        decision: 'pending',
      })
    }
    if (added.length) changeRedactions([...redactions, ...added])
    setAnalysisMessage(
      added.length === 0 && skipped === 0
        ? t('analysis.noSuggestions')
        : skipped
          ? t('analysis.partial', { added: added.length, skipped })
          : t('analysis.added', { count: added.length }),
    )
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

  const downloadText = async () => {
    if (!exportAllowed || !item.responseText) return
    setExportError(false)
    try {
      const blob = await buildExportBlob(
        redactText(item.responseText, redactions, t('replacement')),
        exportFormat,
      )
      downloadBlob(
        blob,
        `${item.reference.replaceAll('/', '-')}-zanonimizowana.${exportFormat}`,
      )
    } catch (error) {
      console.error('Cannot export anonymized text', error)
      setExportError(true)
    }
  }

  const recordSent = async () => {
    if (!validIsoDate(sentAt)) {
      setSendDateError(true)
      return
    }
    setSendError(false)
    // The server only allows moving forward step by step, so a case that has
    // not reached RESPONSE_PREPARED yet goes through it first.
    try {
      if (item.apiStatus !== 'RESPONSE_PREPARED') {
        await changeCaseStatusAsync({
          id: item.id,
          status: 'RESPONSE_PREPARED',
        })
      }
      await changeCaseStatusAsync({
        id: item.id,
        status: 'RESPONSE_SENT',
        respondedAt: sentAt,
        comment: sentNote.trim() || undefined,
      })
    } catch {
      setSendError(true)
      return
    }
    updateCase(item.id, {
      status: 'completed',
      sentAt,
      sentNote: sentNote.trim(),
    })
    setSendDialogOpen(false)
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

        <Alert severity="warning">{t('warning')}</Alert>
        {exportError && <Alert severity="error">{t('errors.export')}</Alert>}

        {responseNeedsSaving ? (
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Alert severity="warning">{t('waiting.description')}</Alert>
              <Button
                component={Link}
                to={routes.caseTab(item.id, caseTabs.materials)}
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
                to={routes.caseTab(item.id, caseTabs.materials)}
                variant="outlined"
                fullWidth
              >
                {t('missing.goToMaterials')}
              </Button>
            </Stack>
          </Paper>
        ) : (
          <Grid>
            <Paper variant="outlined" sx={{ p: 2, gridArea: 'analysis' }}>
              <Stack spacing={1.5}>
                <Typography variant="h2">{t('analysis.title')}</Typography>
                <Typography color="text.secondary">
                  {t('analysis.description')}
                </Typography>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => void runAnalysis()}
                  disabled={completed || isGettingRedactionSuggestions}
                >
                  {isGettingRedactionSuggestions
                    ? t('analysis.running')
                    : t('analysis.run')}
                </Button>
                {analysisError && (
                  <Alert severity="error">{analysisError}</Alert>
                )}
                {analysisMessage && (
                  <Alert severity="info" role="status">
                    {analysisMessage}
                  </Alert>
                )}
              </Stack>
            </Paper>

            <ManualFragmentForm
              disabled={completed}
              onAdd={addManualFragment}
            />

            <RedactionList
              redactions={redactions}
              disabled={completed}
              onDecide={decide}
            />

            <RedactionPreview
              text={item.responseText}
              redactions={redactions}
            />

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
                <TextField
                  select
                  label={t('format')}
                  value={exportFormat}
                  onChange={(event) =>
                    setExportFormat(event.target.value as ExportFormat)
                  }
                  slotProps={{ select: { native: true } }}
                >
                  {exportFormats.map((format) => (
                    <option key={format} value={format}>
                      {format.toUpperCase()}
                    </option>
                  ))}
                </TextField>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => void downloadText()}
                  disabled={!exportAllowed || !item.responseText}
                >
                  {t('export')}
                </Button>
                <Typography variant="caption" color="text.secondary">
                  {t('review.exportNote')}
                </Typography>
              </Stack>
            </Paper>
          </Grid>
        )}

        {!completed && (
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
              setSendError(false)
              setSendDialogOpen(true)
            }}
          >
            {t('sent.openDialog')}
          </Button>
        )}
        <Box>
          <StepBackButton to={routes.caseTab(item.id, caseTabs.materials)} />
        </Box>
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
            {sendError && <Alert severity="error">{t('sent.error')}</Alert>}
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
          <Button
            fullWidth
            variant="contained"
            onClick={() => void recordSent()}
            disabled={isChangingCaseStatus}
          >
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
