import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { Button, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { LoginPage } from '@/features/auth/login-page'
import type { DemoUser } from '@/features/auth/mock-auth'

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

const CasesPlaceholder = ({
  user,
  onLogout,
}: {
  user: DemoUser
  onLogout: () => void
}) => {
  const { t } = useTranslation()
  return (
    <PageLayout>
      <Typography variant="body2" color="text.secondary">
        {t('auth.demo.session', { name: t(user.nameKey) })}
      </Typography>
      <Typography variant="h1">{t('cases.title')}</Typography>
      <Typography color="text.secondary">{t('cases.placeholder')}</Typography>
      <Button variant="outlined" onClick={onLogout}>
        {t('auth.logout')}
      </Button>
    </PageLayout>
  )
}

const NotFoundPage = () => {
  const { t } = useTranslation()
  return (
    <PageLayout>
      <Typography variant="h1">{t('notFound.title')}</Typography>
      <Button component={Link} variant="text" to="/">
        {t('notFound.back')}
      </Button>
    </PageLayout>
  )
}

const App = () => {
  const [user, setUser] = useState<DemoUser | null>(null)

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={user ? '/sprawy' : '/login'} replace />}
      />
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/sprawy" replace />
          ) : (
            <LoginPage onLogin={setUser} />
          )
        }
      />
      <Route
        path="/sprawy"
        element={
          user ? (
            <CasesPlaceholder user={user} onLogout={() => setUser(null)} />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
