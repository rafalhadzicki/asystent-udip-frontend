import { useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { addDays, format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import {
  useCancelExtension,
  useExtendDeadline,
} from '@/api/cases/cases.queries'
import { getApiErrorKind } from '@/api/errors'
import { displayDate } from '@/features/demo/date-utils'
import type { CaseItem } from '@/features/demo/types'

const MAX_REASON_LENGTH = 1000

type DeadlineExtensionProps = { item: CaseItem }

// Extending the deadline (kwerenda) is stored on the server, so it only exists
// for cases composed from the API.
export const DeadlineExtension = ({ item }: DeadlineExtensionProps) => {
  const { t } = useTranslation('translation', { keyPrefix: 'extension' })
  const { extendDeadlineAsync, isExtendingDeadline } = useExtendDeadline()
  const { cancelExtensionAsync, isCancellingExtension } = useCancelExtension()
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const { extension } = item

  if (!extension) return null
  const finished = item.apiStatus === 'RESPONSE_SENT'
  const minDate = format(addDays(parseISO(extension.dueAt), 1), 'yyyy-MM-dd')
  const extended = Boolean(extension.extendedDueAt)

  const errorMessage = (failure: unknown) => {
    const kind = getApiErrorKind(failure)
    return t(kind === 'invalid' || kind === 'conflict' ? kind : 'unknown')
  }

  const openDialog = () => {
    setDate(extension.extendedDueAt ?? '')
    setReason(extension.reason)
    setError('')
    setOpen(true)
  }

  const save = async () => {
    if (!date || date < minDate || date > extension.maxDate) {
      setError(
        t('dateRange', {
          from: displayDate(minDate),
          to: displayDate(extension.maxDate),
        }),
      )
      return
    }
    if (!reason.trim()) {
      setError(t('reasonRequired'))
      return
    }
    try {
      await extendDeadlineAsync({
        id: item.id,
        extendedDueAt: date,
        reason: reason.trim(),
      })
      setOpen(false)
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }

  const withdraw = async () => {
    setError('')
    try {
      await cancelExtensionAsync(item.id)
    } catch (failure) {
      setError(errorMessage(failure))
    }
  }

  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {extended && (
        <Alert severity="info">
          {t('active', {
            from: displayDate(extension.dueAt),
            to: displayDate(extension.extendedDueAt ?? ''),
            reason: extension.reason,
          })}
        </Alert>
      )}
      {error && !open && <Alert severity="error">{error}</Alert>}
      {!finished && (
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <Button variant="outlined" size="small" onClick={openDialog}>
            {t(extended ? 'change' : 'open')}
          </Button>
          {extended && (
            <Button
              size="small"
              color="inherit"
              onClick={() => void withdraw()}
              disabled={isCancellingExtension}
            >
              {t('withdraw')}
            </Button>
          )}
        </Stack>
      )}

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('info', { from: displayDate(extension.dueAt) })}
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              fullWidth
              required
              type="date"
              label={t('date')}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: minDate, max: extension.maxDate },
              }}
              helperText={t('dateRange', {
                from: displayDate(minDate),
                to: displayDate(extension.maxDate),
              })}
            />
            <TextField
              fullWidth
              required
              multiline
              minRows={3}
              label={t('reason')}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              slotProps={{ htmlInput: { maxLength: MAX_REASON_LENGTH } }}
              helperText={t('reasonHelp')}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>{t('cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => void save()}
            disabled={isExtendingDeadline}
          >
            {t('save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
