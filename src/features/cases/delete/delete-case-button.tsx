import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useDeleteCase } from '@/api/cases/cases.queries'
import { routes } from '@/app/routes'
import { useLocalStore } from '@/features/cases/local-store'
import type { CaseItem } from '@/features/cases/types'

export const DeleteCaseButton = ({ item }: { item: CaseItem }) => {
  const { t } = useTranslation('translation', {
    keyPrefix: 'caseDetail.delete',
  })
  const navigate = useNavigate()
  const { removeCase } = useLocalStore()
  const { deleteCaseAsync, isDeletingCase } = useDeleteCase()
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)

  const close = () => {
    if (isDeletingCase) return
    setOpen(false)
    setFailed(false)
  }

  const confirm = async () => {
    setFailed(false)
    try {
      await deleteCaseAsync(item.id)
    } catch {
      setFailed(true)
      return
    }
    removeCase(item.id)
    navigate(routes.cases)
  }

  return (
    <>
      <Button color="error" onClick={() => setOpen(true)}>
        {t('open')}
      </Button>
      <Dialog open={open} onClose={close} aria-labelledby="delete-case-title">
        <DialogTitle id="delete-case-title">{t('title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('description', { reference: item.reference })}
          </DialogContentText>
          {failed && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t('error')}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={isDeletingCase}>
            {t('cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirm}
            disabled={isDeletingCase}
          >
            {t('confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
