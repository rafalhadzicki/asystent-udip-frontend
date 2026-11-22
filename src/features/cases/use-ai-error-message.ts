import { useTranslation } from 'react-i18next'
import { getApiErrorKind } from '@/api/errors'

// Message for a failed AI request: the server states whether the AI is not
// configured (503) or failed (502); anything else gets the given fallback.
export const useAiErrorMessage = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'apiErrors' })
  return (error: unknown, fallback: string) => {
    const kind = getApiErrorKind(error)
    return kind === 'aiNotConfigured' || kind === 'aiFailed'
      ? t(kind)
      : fallback
  }
}
