import { Typography } from '@mui/material'
import { styled } from '@mui/material/styles'

const Layout = styled('div')(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  alignItems: 'start',
  [theme.breakpoints.up('md')]: { gridTemplateColumns: '320px minmax(0, 1fr)' },
}))

const Section = styled('section')(({ theme }) => ({
  padding: theme.spacing(3),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2.5),
}))

const SectionHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: theme.spacing(1.5),
}))

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  fontWeight: 600,
  color: theme.palette.primary.main,
}))

const SourceIcon = styled('div')(({ theme }) => ({
  width: 48,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '& svg': { width: 24, height: 24 },
}))

const Details = styled('dl')(({ theme }) => ({
  margin: 0,
  display: 'grid',
  gap: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
}))

const Detail = styled('div', { shouldForwardProp: (prop) => prop !== 'wide' })<{
  wide?: boolean
}>(({ wide }) => ({ minWidth: 0, gridColumn: wide ? '1 / -1' : undefined }))

const Term = styled('dt')(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
  fontSize: '0.8125rem',
  color: theme.palette.text.secondary,
}))

const Description = styled('dd')(({ theme }) => ({
  margin: 0,
  color: theme.palette.text.primary,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
}))

const RequestText = styled(Description)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  lineHeight: 1.6,
}))

const FieldGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  '& .wide': { gridColumn: '1 / -1' },
}))

const Actions = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: theme.spacing(1.5),
}))

export {
  Layout,
  Section,
  SectionHeader,
  SectionTitle,
  SourceIcon,
  Details,
  Detail,
  Term,
  Description,
  RequestText,
  FieldGrid,
  Actions,
}
