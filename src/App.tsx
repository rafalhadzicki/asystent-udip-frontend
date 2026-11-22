import { useTranslation } from 'react-i18next'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { Button, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { LoginPage } from '@/features/auth/login-page'
import { useSession } from '@/api/session'
import { logout } from '@/api/auth/auth.api'
import {
  clearLocalStore,
  LocalStoreProvider,
} from '@/features/cases/local-store'
import { AppLayout } from '@/app/app-layout'
import { CaseLayout } from '@/app/case-layout'
import { caseTabs, routes } from '@/app/routes'
import { RegisterPage } from '@/features/cases/register/register-page'
import { UploadPage } from '@/features/cases/upload/upload-page'
import { VerificationPage } from '@/features/cases/verification/verification-page'
import { RequestPage } from '@/features/cases/request/request-page'
import { AnalysisPage } from '@/features/cases/analysis/analysis-page'
import { MaterialsPage } from '@/features/cases/materials/materials-page'
import { RedactionPage } from '@/features/cases/redaction/redaction-page'
import { CalendarPage } from '@/features/calendar/calendar-page'
import { KnowledgePage } from '@/features/knowledge/knowledge-page'

const PageLayout = styled('main')(({ theme }) => ({
  margin: '0 auto',
  minHeight: '100svh',
  maxWidth: 768,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(6, 3),
}))

const NotFoundPage = () => {
  const { t } = useTranslation()
  return (
    <PageLayout>
      <Typography variant="h1">{t('notFound.title')}</Typography>
      <Button component={Link} variant="text" to={routes.home}>
        {t('notFound.back')}
      </Button>
    </PageLayout>
  )
}

const signOut = () => {
  clearLocalStore()
  logout()
}

const App = () => {
  const user = useSession()
  return (
    <LocalStoreProvider>
      <Routes>
        <Route
          path={routes.home}
          element={<Navigate to={user ? routes.cases : routes.login} replace />}
        />
        <Route
          path={routes.login}
          element={
            user ? <Navigate to={routes.cases} replace /> : <LoginPage />
          }
        />
        <Route
          element={
            user ? (
              <AppLayout user={user} onLogout={signOut} />
            ) : (
              <Navigate to={routes.login} replace />
            )
          }
        >
          <Route path={routes.cases} element={<RegisterPage />} />
          <Route path={routes.upload} element={<UploadPage />} />
          <Route path={routes.verification} element={<VerificationPage />} />
          <Route path={routes.casePattern} element={<CaseLayout />}>
            <Route index element={<Navigate to={caseTabs.request} replace />} />
            <Route path={caseTabs.request} element={<RequestPage />} />
            <Route path={caseTabs.analysis} element={<AnalysisPage />} />
            <Route path={caseTabs.materials} element={<MaterialsPage />} />
            <Route path={caseTabs.redaction} element={<RedactionPage />} />
          </Route>
          <Route path={routes.calendar} element={<CalendarPage />} />
          <Route path={routes.knowledge} element={<KnowledgePage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </LocalStoreProvider>
  )
}

export default App
