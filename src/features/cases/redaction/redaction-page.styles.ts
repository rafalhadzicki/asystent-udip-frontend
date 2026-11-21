import { Box, Paper } from '@mui/material'
import { styled } from '@mui/material/styles'

const Page = styled('section')(({ theme }) => ({
  width: '100%',
  margin: '0 auto',
  paddingBottom: theme.spacing(3),
}))

const Preview = styled(Paper)(({ theme }) => ({
  minHeight: 180,
  maxHeight: 440,
  overflow: 'auto',
  padding: theme.spacing(2),
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  fontFamily: 'inherit',
  lineHeight: 1.7,
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
  [theme.breakpoints.up('lg')]: {
    position: 'sticky',
    top: 24,
  },
}))

export { Grid, Page, Preview, PreviewPanel }
