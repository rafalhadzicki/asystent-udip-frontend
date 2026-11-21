import { useState } from 'react'
import { Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { Redaction } from '@/features/demo/types'
import { Preview, PreviewPanel } from './redaction-page.styles'
import { redactText } from './redaction-utils'

type RedactionPreviewProps = {
  text: string
  redactions: Redaction[]
}

export const RedactionPreview = ({
  text,
  redactions,
}: RedactionPreviewProps) => {
  const { t } = useTranslation('translation', { keyPrefix: 'redaction' })
  const [showOriginal, setShowOriginal] = useState(false)

  return (
    <PreviewPanel variant="outlined">
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
          {t(showOriginal ? 'preview.showSanitized' : 'preview.showOriginal')}
        </Button>
        <Preview variant="outlined" aria-label={t('preview.label')}>
          {showOriginal ? text : redactText(text, redactions, t('replacement'))}
        </Preview>
      </Stack>
    </PreviewPanel>
  )
}
