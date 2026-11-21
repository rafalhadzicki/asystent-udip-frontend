import { useState } from 'react'
import { Button, Paper, Stack, TextField, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'

type ManualFragmentFormProps = {
  disabled: boolean
  onAdd: (fragment: string) => string | null
}

export const ManualFragmentForm = ({
  disabled,
  onAdd,
}: ManualFragmentFormProps) => {
  const { t } = useTranslation('translation', { keyPrefix: 'redaction' })
  const [fragment, setFragment] = useState('')
  const [error, setError] = useState('')

  const add = () => {
    const errorMessage = onAdd(fragment)
    if (errorMessage) {
      setError(errorMessage)
      return
    }
    setFragment('')
    setError('')
  }

  return (
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
            setError('')
          }}
          error={Boolean(error)}
          helperText={error || t('manual.helper')}
          disabled={disabled}
        />
        <Button variant="contained" fullWidth onClick={add} disabled={disabled}>
          {t('manual.add')}
        </Button>
      </Stack>
    </Paper>
  )
}
