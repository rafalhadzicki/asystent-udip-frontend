import { styled } from '@mui/material/styles'

export const SectionCard = styled('section')(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(3),
}))
