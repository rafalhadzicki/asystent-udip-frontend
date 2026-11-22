import {
  Chip,
  Paper,
  TableCell,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import type { KnowledgeCategory } from '@/api/knowledge/knowledge.schemas'

const PageRoot = styled('section')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  width: '100%',
  maxWidth: 1200,
  margin: '0 auto',
  padding: theme.spacing(3, 0),
}))

const PageHeader = styled('header')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
}))

const HeaderText = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  maxWidth: 680,
}))

const HeaderActions = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}))

const Toolbar = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
}))

const SearchField = styled(TextField)({
  flex: '1 1 280px',
  maxWidth: 480,
})

const CategoryGroup = styled(ToggleButtonGroup)({
  flexWrap: 'wrap',
})

const CategoryButton = styled(ToggleButton)(({ theme }) => ({
  textTransform: 'none',
  padding: theme.spacing(0.5, 1.5),
  fontWeight: 500,
}))

const ListPanel = styled(Paper)(({ theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  overflow: 'hidden',
}))

const HeaderCell = styled(TableCell)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.secondary,
  backgroundColor: theme.palette.background.default,
  whiteSpace: 'nowrap',
}))

const NameCell = styled(TableCell)({
  minWidth: 280,
})

const ItemName = styled(Typography)({
  fontWeight: 600,
})

const ItemDescription = styled(Typography)({
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
})

const FileMeta = styled(Typography)(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(0.5),
  color: theme.palette.text.secondary,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}))

const CategoryChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'category',
})<{ category: KnowledgeCategory }>(({ theme, category }) => {
  const colors: Record<KnowledgeCategory, string> = {
    LAW: theme.palette.primary.main,
    RESPONSE: theme.palette.success.dark,
    GUIDELINE: theme.palette.warning.dark,
  }
  return {
    fontWeight: 500,
    color: colors[category],
    borderColor: colors[category],
  }
})

const NoWrapCell = styled(TableCell)({
  whiteSpace: 'nowrap',
})

const ActionsCell = styled(TableCell)(({ theme }) => ({
  whiteSpace: 'nowrap',
  '& > * + *': { marginLeft: theme.spacing(1) },
}))

const EmptyState = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(5, 2),
  textAlign: 'center',
}))

const FormStack = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2.5),
  paddingTop: theme.spacing(1),
}))

const FilePicker = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: theme.spacing(0.75),
}))

const FileLabel = styled('label')(({ theme }) => ({
  ...theme.typography.body2,
  fontWeight: 600,
}))

const HiddenFileInput = styled('input')({
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

const MetaList = styled('dl')(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'minmax(120px, max-content) 1fr',
  gap: theme.spacing(1, 2),
  margin: theme.spacing(2, 0, 0),
  '& dt': { fontWeight: 600, color: theme.palette.text.secondary },
  '& dd': { margin: 0, overflowWrap: 'anywhere' },
}))

const PreviewText = styled('pre')(({ theme }) => ({
  margin: theme.spacing(2, 0),
  padding: theme.spacing(1.5),
  maxHeight: 280,
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  fontFamily: 'inherit',
  fontSize: theme.typography.body2.fontSize,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
}))

export {
  PreviewText,
  PageRoot,
  PageHeader,
  HeaderText,
  HeaderActions,
  Toolbar,
  SearchField,
  CategoryGroup,
  CategoryButton,
  ListPanel,
  HeaderCell,
  NameCell,
  ItemName,
  ItemDescription,
  FileMeta,
  CategoryChip,
  NoWrapCell,
  ActionsCell,
  EmptyState,
  FormStack,
  FilePicker,
  FileLabel,
  HiddenFileInput,
  MetaList,
}
