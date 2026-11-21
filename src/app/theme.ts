import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    primary: { main: '#102a43' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#172b4d', secondary: '#526175' },
  },
  typography: {
    fontFamily: '"Geist Variable", sans-serif',
    h1: { fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.025em' },
    h2: { fontSize: '1.25rem', fontWeight: 600 },
    h3: { fontSize: '1.125rem', fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
        sizeLarge: { minHeight: 48, fontSize: '1rem' },
      },
    },
    MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true } },
  },
})
