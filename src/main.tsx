import { QueryClientProvider } from '@tanstack/react-query'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { clearCacheOnSessionChange, queryClient } from './api/query-client'
import '@fontsource-variable/geist'
import { theme } from './app/theme'
import i18n from './i18n'

document.documentElement.lang = i18n.resolvedLanguage ?? 'pl'
document.title = i18n.t('app.name')

clearCacheOnSessionChange(queryClient)
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error(i18n.t('app.missingRoot'))
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
