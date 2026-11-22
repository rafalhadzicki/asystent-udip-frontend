import { Button } from '@mui/material'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

type StepBackButtonProps = { to: string }

// Mirrors the "next" button at the bottom of a case step.
export const StepBackButton = ({ to }: StepBackButtonProps) => {
  const { t } = useTranslation()
  return (
    <Button
      component={Link}
      to={to}
      variant="text"
      startIcon={<ArrowLeft aria-hidden="true" size={16} />}
    >
      {t('common.back')}
    </Button>
  )
}
