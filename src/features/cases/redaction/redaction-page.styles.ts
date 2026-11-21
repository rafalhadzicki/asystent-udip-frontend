import { Paper } from '@mui/material'
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

export { Page, Preview }
