import {
  Alert,
  Box,
  Button,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import { useTranslation } from 'react-i18next'
import type { Redaction, RedactionDecision } from '@/features/demo/types'

type RedactionListProps = {
  redactions: Redaction[]
  disabled: boolean
  onDecide: (id: string, decision: RedactionDecision) => void
}

export const RedactionList = ({
  redactions,
  disabled,
  onDecide,
}: RedactionListProps) => {
  const { t } = useTranslation('translation', { keyPrefix: 'redaction' })

  return (
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
                  {(['hide', 'keep', 'pending'] as const).map((decision) => (
                    <Button
                      key={decision}
                      fullWidth
                      size="small"
                      variant={
                        redaction.decision === decision
                          ? 'contained'
                          : 'outlined'
                      }
                      disabled={disabled}
                      aria-pressed={redaction.decision === decision}
                      onClick={() => onDecide(redaction.id, decision)}
                    >
                      {t(`decisions.${decision}`)}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  )
}
