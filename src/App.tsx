import { useState } from 'react'
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
  return (
    <PageLayout>
      <Typography variant="body2" color="text.secondary">
        Sesja demonstracyjna · {user.name}
      </Typography>
      <Typography variant="h1">Sprawy</Typography>
      <Typography color="text.secondary">
        To szkielet aplikacji. Widoki obsługi spraw zostaną dodane po
        zatwierdzeniu projektu interfejsu.
      </Typography>
      <Button variant="outlined" onClick={onLogout}>
        Wyloguj się
      </Button>
    </PageLayout>
  )
}

const NotFoundPage = () => {
  return (
    <PageLayout>
      <Typography variant="h1">Nie znaleziono strony</Typography>
      <Button component={Link} variant="text" to="/">
        Wróć do strony głównej
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
