import { Box, Paper } from '@mui/material'
import { alpha, styled } from '@mui/material/styles'

const Page = styled('section')(({ theme }) => ({
  width: '100%',
  margin: '0 auto',
  paddingBottom: theme.spacing(3),
}))

// The preview fills the panel down to its bottom edge and scrolls inside, so a
// long text never makes the row taller than the panels next to it.
const PreviewBox = styled(Box)({
  position: 'relative',
  flex: 1,
  minHeight: 240,
})

const Preview = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  overflow: 'auto',
  padding: theme.spacing(2),
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  fontFamily: 'inherit',
  lineHeight: 1.7,
}))

const Mark = styled('mark')(({ theme }) => ({
  borderRadius: 3,
  padding: '0 2px',
  color: 'inherit',
  '&[data-decision="pending"]': {
    backgroundColor: alpha(theme.palette.warning.main, 0.35),
  },
  '&[data-decision="hide"]': {
    backgroundColor: alpha(theme.palette.error.main, 0.25),
  },
  '&[data-decision="keep"]': {
    backgroundColor: alpha(theme.palette.success.main, 0.25),
  },
}))

const Grid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gridTemplateAreas: '"preview" "analysis" "manual" "decisions" "review"',
  gap: theme.spacing(2.5),
  alignItems: 'start',
  [theme.breakpoints.up('lg')]: {
    gridTemplateColumns: 'minmax(0, 1.7fr) minmax(300px, 1fr)',
    gridTemplateAreas:
      '"preview analysis" "preview manual" "preview decisions" "review review"',
  },
}))

const PreviewPanel = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  gridArea: 'preview',
  alignSelf: 'stretch',
  display: 'flex',
  flexDirection: 'column',
}))

export { Grid, Mark, Page, Preview, PreviewBox, PreviewPanel }
