import { Box, Paper } from '@mui/material'
import { styled } from '@mui/material/styles'

const Page = styled(Box)(({ theme }) => ({
  maxWidth: 1220,
  margin: '0 auto',
  padding: theme.spacing(3),
  [theme.breakpoints.down('sm')]: { padding: theme.spacing(2) },
}))

const Card = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  border: '1px solid #e4e9ef',
  [theme.breakpoints.down('sm')]: { padding: theme.spacing(2) },
}))

const DropZone = styled(Box)(({ theme }) => ({
  minHeight: 310,
  border: '2px dashed #91a5bd',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: '#f5f7fa',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(3),
  textAlign: 'center',
}))

const IconBox = styled(Box)(({ theme }) => ({
  display: 'grid',
  placeItems: 'center',
  width: 64,
  height: 64,
  color: theme.palette.primary.main,
  background: '#e5ebf1',
  borderRadius: 16,
}))

const HiddenInput = styled('input')({
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
})

export { Page, Card, DropZone, IconBox, HiddenInput }
