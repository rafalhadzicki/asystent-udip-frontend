import { Paper } from '@mui/material'
import { styled } from '@mui/material/styles'

const Page = styled('section')(({ theme }) => ({
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
}))

const Header = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  border: '1px solid #e4e9ef',
  boxShadow: 'none',
}))

const Content = styled('div')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 340px)',
  gap: theme.spacing(2),
  alignItems: 'start',
  [theme.breakpoints.down('lg')]: { gridTemplateColumns: 'minmax(0, 1fr)' },
}))

const GridWrapper = styled(Paper)({
  minWidth: 0,
  overflowX: 'auto',
  border: '1px solid #e4e9ef',
  boxShadow: 'none',
})

const Grid = styled('div')({
  minWidth: 700,
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
})

const Weekday = styled('div')(({ theme }) => ({
  padding: theme.spacing(1.25, 1),
  background: '#f5f7fa',
  color: theme.palette.text.secondary,
  fontSize: '0.75rem',
  fontWeight: 700,
  textAlign: 'center',
  textTransform: 'uppercase',
}))

const Day = styled('button', {
  shouldForwardProp: (prop) =>
    prop !== 'selectedDay' && prop !== 'outsideMonth',
})<{ selectedDay: boolean; outsideMonth: boolean }>(
  ({ theme, selectedDay, outsideMonth }) => ({
    appearance: 'none',
    minWidth: 0,
    minHeight: 112,
    padding: theme.spacing(1),
    border: 0,
    borderTop: '1px solid #e4e9ef',
    borderRight: '1px solid #e4e9ef',
    background: selectedDay ? '#102a43' : outsideMonth ? '#f6f7f9' : '#fff',
    color: selectedDay
      ? '#fff'
      : outsideMonth
        ? '#778495'
        : theme.palette.text.primary,
    textAlign: 'left',
    verticalAlign: 'top',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    '&:hover': { background: selectedDay ? '#193b5b' : '#edf3f9' },
    '&:focus-visible': { outline: '3px solid #2966b0', outlineOffset: '-3px' },
  }),
)

const Reference = styled('span')({
  display: 'block',
  width: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '0.7rem',
  fontWeight: 600,
})

const Detail = styled(Paper)(({ theme }) => ({
  minWidth: 0,
  padding: theme.spacing(2.5),
  border: '1px solid #e4e9ef',
  boxShadow: 'none',
}))

const CaseCard = styled('article')(({ theme }) => ({
  padding: theme.spacing(2),
  border: '1px solid #e4e9ef',
  borderRadius: theme.shape.borderRadius,
  background: '#f8fafc',
}))

export {
  Page,
  Header,
  Content,
  GridWrapper,
  Grid,
  Weekday,
  Day,
  Reference,
  Detail,
  CaseCard,
}
