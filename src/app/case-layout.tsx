import {
  Alert,
  Button,
  Chip,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { useMemo } from 'react'
import { Link, Outlet, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useGetCaseById } from '@/api/cases/cases.queries'
import { composeApiCase } from '@/features/cases/case-from-api'
import { useDemoStore } from '@/features/demo/demo-store'
import { displayDate } from '@/features/demo/date-utils'
import { DeadlineExtension } from '@/features/cases/extension/deadline-extension'
import { caseTabs, routes } from './routes'

export const CaseLayout = () => {
  const { caseId } = useParams()
  const { overlays } = useDemoStore()
  const { t } = useTranslation()
  const location = useLocation()
  const { caseDetail, isCaseLoading } = useGetCaseById(caseId)
  const item = useMemo(
    () => caseDetail && composeApiCase(caseDetail, overlays[caseDetail.id]),
    [caseDetail, overlays],
  )

  if (!item && isCaseLoading)
    return (
      <Typography role="status" color="text.secondary">
        {t('caseDetail.loading')}
      </Typography>
    )
  if (!item)
    return (
      <Stack spacing={2}>
        <Alert severity="warning">{t('caseDetail.missing')}</Alert>
        <Button component={Link} to={routes.cases}>
          {t('caseDetail.back')}
        </Button>
      </Stack>
    )
  const tabs = [
    { path: caseTabs.request, label: t('caseDetail.request') },
    { path: caseTabs.analysis, label: t('caseDetail.analysis') },
    { path: caseTabs.materials, label: t('caseDetail.materials') },
    { path: caseTabs.redaction, label: t('caseDetail.redaction') },
  ]
  const active = tabs.findIndex((tab) =>
    location.pathname.endsWith(`/${tab.path}`),
  )
  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Button component={Link} to={routes.cases} sx={{ mb: 1 }}>
          {t('caseDetail.back')}
        </Button>
        <Typography variant="body2" color="text.secondary">
          {item.reference}
        </Typography>
        <Typography variant="h1" sx={{ my: 1, overflowWrap: 'anywhere' }}>
          {item.subject}
        </Typography>
        <Stack
          direction="row"
          sx={{ my: 2, flexWrap: 'wrap', gap: 2, alignItems: 'center' }}
        >
          <Typography variant="body2">
            {t('caseDetail.received', { date: displayDate(item.receivedAt) })}
          </Typography>
          <Typography variant="body2">
            {t('caseDetail.deadline', { date: displayDate(item.deadline) })}
          </Typography>
          <Typography variant="body2">{item.applicant}</Typography>
          <Chip size="small" label={t(`register.status.${item.apiStatus}`)} />
        </Stack>
        <DeadlineExtension item={item} />
        {item.status === 'completed' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('caseDetail.completed', { date: displayDate(item.sentAt) })}
            {item.sentNote &&
              ` ${t('caseDetail.completedNote', { note: item.sentNote })}`}
          </Alert>
        )}
        <Tabs
          value={active < 0 ? 0 : active}
          variant="scrollable"
          scrollButtons="auto"
          aria-label={t('caseDetail.tabs')}
        >
          {tabs.map((tab) => (
            <Tab
              key={tab.path}
              label={tab.label}
              component={Link}
              to={routes.caseTab(item.id, tab.path)}
            />
          ))}
        </Tabs>
      </Paper>
      <Outlet context={item} />
    </Stack>
  )
}
