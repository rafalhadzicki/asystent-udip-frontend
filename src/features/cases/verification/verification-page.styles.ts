import { Paper } from '@mui/material'
import { styled } from '@mui/material/styles'

const Page = styled('section')({
  width: '100%',
  maxWidth: 1440,
  minWidth: 0,
  margin: '0 auto',
})
const Columns = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 0.85fr) minmax(0, 1.15fr)',
  gap: theme.spacing(3),
  marginTop: theme.spacing(3),
  [theme.breakpoints.down('md')]: { gridTemplateColumns: 'minmax(0, 1fr)' },
}))
const Card = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  minWidth: 0,
  border: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
}))
const SourceCard = styled(Card)({ display: 'flex', flexDirection: 'column' })
const Fields = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: theme.spacing(2.5),
  marginTop: theme.spacing(3),
  [theme.breakpoints.down('sm')]: { gridTemplateColumns: 'minmax(0, 1fr)' },
}))
const FullWidth = styled('div')({ gridColumn: '1 / -1', minWidth: 0 })
// The text fills the card down to its bottom edge and scrolls inside, so a long
// text never makes the card taller than the form next to it.
const SourceBox = styled('div')({
  position: 'relative',
  flex: 1,
  minHeight: 240,
})
const SourceText = styled('div')(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  background: theme.palette.background.default,
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  overflowY: 'auto',
}))
const Actions = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  marginTop: theme.spacing(3),
}))

export {
  Page,
  Columns,
  Card,
  SourceCard,
  Fields,
  FullWidth,
  SourceBox,
  SourceText,
  Actions,
}
