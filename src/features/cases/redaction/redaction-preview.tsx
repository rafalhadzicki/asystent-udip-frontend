import { useState } from 'react'
import { Button, Stack, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { Redaction } from '@/features/demo/types'
import { Mark, Preview, PreviewPanel } from './redaction-page.styles'
import { segmentText } from './redaction-utils'

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
        <Typography variant="caption" color="text.secondary">
          {t('preview.legend')}
        </Typography>
        <Preview variant="outlined" aria-label={t('preview.label')}>
          {segmentText(text, redactions, {
            applyHidden: !showOriginal,
            replacement: t('replacement'),
          }).map((segment, index) =>
            segment.decision ? (
              <Mark key={index} data-decision={segment.decision}>
                {segment.text}
              </Mark>
            ) : (
              segment.text
            ),
          )}
        </Preview>
      </Stack>
    </PreviewPanel>
  )
}
