import { styled } from '@mui/material/styles'

const Layout = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 2fr) minmax(260px, 1fr)',
  gap: theme.spacing(2),
  alignItems: 'start',
  [theme.breakpoints.down('md')]: { gridTemplateColumns: 'minmax(0, 1fr)' },
}))

const Item = styled('div')(({ theme }) => ({
  minWidth: 0,
  overflowWrap: 'anywhere',
  padding: theme.spacing(2),
  backgroundColor: '#f5f7f9',
  borderRadius: theme.shape.borderRadius,
}))

const Actions = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: theme.spacing(1.5),
  padding: theme.spacing(2, 0),
}))

export { Layout, Item, Actions }
