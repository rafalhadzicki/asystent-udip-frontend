import { styled } from '@mui/material/styles'

const Layout = styled('section')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
}))

const Columns = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
  gap: theme.spacing(3),
  alignItems: 'start',
  [theme.breakpoints.down('md')]: { gridTemplateColumns: 'minmax(0, 1fr)' },
}))

const MaterialItem = styled('li')(({ theme }) => ({
  listStyle: 'none',
  padding: theme.spacing(1.5),
  borderRadius: theme.shape.borderRadius,
  background: theme.palette.background.default,
  overflowWrap: 'anywhere',
}))

export { Layout, Columns, MaterialItem }
