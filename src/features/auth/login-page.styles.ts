import { Chip } from '@mui/material'
import { styled } from '@mui/material/styles'

export const LoginLayout = styled('main')(({ theme }) => ({
  minHeight: '100svh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(5, 2),
  backgroundColor: theme.palette.background.default,
}))

export const LoginContainer = styled('div')({
  width: '100%',
  maxWidth: 448,
})

export const LoginHeader = styled('header')(({ theme }) => ({
  marginBottom: theme.spacing(4),
  textAlign: 'center',
}))

export const BrandIcon = styled('div')(({ theme }) => ({
  width: 64,
  height: 64,
  margin: theme.spacing(0, 'auto', 2.5),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 12,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '& svg': { width: 28, height: 28 },
}))

export const DemoChip = styled(Chip)(({ theme }) => ({
  marginTop: theme.spacing(2),
  color: theme.palette.text.secondary,
  backgroundColor: '#e9eef4',
  '& .MuiChip-icon': { color: '#2563eb', width: 8, height: 8 },
}))

export const LoginForm = styled('form')(({ theme }) => ({
  padding: theme.spacing(3),
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  backgroundColor: theme.palette.background.paper,
  boxShadow: '0 1px 3px rgb(15 23 42 / 5%)',
  [theme.breakpoints.up('sm')]: { padding: theme.spacing(4) },
}))

export const LoginFields = styled('fieldset')(({ theme }) => ({
  margin: 0,
  padding: 0,
  border: 0,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2.5),
}))

export const LoginFooter = styled('footer')(({ theme }) => ({
  marginTop: theme.spacing(3),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  overflowWrap: 'anywhere',
}))
