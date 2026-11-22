import { useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import {
  CalendarDays,
  FolderOpen,
  Landmark,
  Library,
  Menu,
  Plus,
} from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { AuthSession } from '@/api/auth/auth.schemas'
import { useDemoStore } from '@/features/demo/demo-store'
import { routes } from './routes'

const Sidebar = styled('nav')(({ theme }) => ({
  width: 240,
  height: '100%',
  padding: theme.spacing(3, 2),
  backgroundColor: theme.palette.background.paper,
  borderRight: `1px solid ${theme.palette.divider}`,
}))

const PageContent = styled('main')(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: { padding: theme.spacing(2) },
}))

export const AppLayout = ({
  user,
  onLogout,
}: {
  user: AuthSession
  onLogout: () => void
}) => {
  const { t } = useTranslation()
  const location = useLocation()
  const { storageError } = useDemoStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const links = [
    {
      to: routes.cases,
      text: t('navigation.cases'),
      icon: <FolderOpen size={20} />,
    },
    {
      to: routes.calendar,
      text: t('navigation.calendar'),
      icon: <CalendarDays size={20} />,
    },
    {
      to: routes.knowledge,
      text: t('navigation.knowledge'),
      icon: <Library size={20} />,
    },
  ]
  const sidebar = (
    <Sidebar aria-label={t('navigation.main')}>
      <Stack direction="row" spacing={1.5} sx={{ mb: 4, alignItems: 'center' }}>
        <Landmark size={32} aria-hidden="true" />
        <Box>
          <Typography sx={{ fontWeight: 700 }}>{t('app.name')}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('app.organization')}
          </Typography>
        </Box>
      </Stack>
      <List>
        {links.map((link) => (
          <ListItemButton
            key={link.to}
            component={Link}
            to={link.to}
            selected={location.pathname.startsWith(link.to)}
            onClick={() => setMenuOpen(false)}
            sx={{
              mb: 1,
              borderRadius: 1,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': { color: 'inherit' },
                '&:hover': { backgroundColor: 'primary.dark' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{link.icon}</ListItemIcon>
            <ListItemText primary={link.text} />
          </ListItemButton>
        ))}
      </List>
    </Sidebar>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100svh' }}>
      <Box
        sx={{ display: { xs: 'none', md: 'block' }, width: 240, flexShrink: 0 }}
      >
        <Box sx={{ position: 'sticky', top: 0, height: '100svh' }}>
          {sidebar}
        </Box>
      </Box>
      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)}>
        {sidebar}
      </Drawer>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack
          component="header"
          direction="row"
          sx={{
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
            p: 2,
            backgroundColor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <IconButton
            aria-label={t('navigation.open')}
            onClick={() => setMenuOpen(true)}
            sx={{ display: { md: 'none' } }}
          >
            <Menu />
          </IconButton>
          <Typography sx={{ flex: 1 }}>
            {links.find((link) => location.pathname.startsWith(link.to))
              ?.text ?? t('app.name')}
          </Typography>
          <Button
            component={Link}
            to={routes.upload}
            variant="contained"
            startIcon={<Plus size={18} />}
          >
            {t('navigation.newCase')}
          </Button>
          <Typography variant="body2">
            {t('auth.session', { email: user.email })}
          </Typography>
          <Button onClick={onLogout}>{t('auth.logout')}</Button>
        </Stack>
        <PageContent>
          {storageError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {t(
                storageError === 'restore'
                  ? 'demo.restoreError'
                  : storageError === 'conflict'
                    ? 'demo.conflictError'
                    : 'demo.saveError',
              )}
            </Alert>
          )}
          <Outlet />
        </PageContent>
      </Box>
    </Box>
  )
}
