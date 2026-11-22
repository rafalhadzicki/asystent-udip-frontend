import { ThemeProvider } from '@mui/material/styles'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  MemoryRouter,
  Outlet,
  Route,
  Routes,
  useParams,
} from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as casesApi from '@/api/cases/cases.api'
import { theme } from '@/app/theme'
import { LocalStoreProvider, useLocalStore } from '@/features/cases/local-store'
import { downloadBlob } from '@/features/cases/download-blob'
import { createDemoCases } from '@/test/demo-cases'
import { detail } from '@/test/case-detail'
import { readSavedCase } from '@/test/saved-case'
import { createTestQueryClient } from '@/test/query-client'
import { RequestPage } from './request-page'

vi.mock('@/api/cases/cases.api', () => ({
  updateCase: vi.fn(),
  downloadCaseDocument: vi.fn(),
}))
vi.mock('@/features/cases/download-blob', () => ({ downloadBlob: vi.fn() }))

let cases = createDemoCases()

// Stands in for CaseLayout: the server case merged with the local overlay.
const CaseOutlet = () => {
  const { caseId } = useParams()
  const { overlays } = useLocalStore()
  const base = cases.find((c) => c.id === caseId)
  const item = base && { ...base, ...overlays[base.id] }
  return item ? (
    <>
      <span data-testid="status">{item.status}</span>
      <span data-testid="response">{item.responseText}</span>
      <Outlet context={item} />
    </>
  ) : null
}

const renderPage = (caseId: string) =>
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={createTestQueryClient()}>
        <LocalStoreProvider>
          <MemoryRouter initialEntries={[`/sprawy/${caseId}/wniosek`]}>
            <Routes>
              <Route path="/sprawy/:caseId" element={<CaseOutlet />}>
                <Route path="wniosek" element={<RequestPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </LocalStoreProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  )

describe('RequestPage', () => {
  beforeEach(() => {
    localStorage.clear()
    cases = createDemoCases()
    vi.mocked(casesApi.updateCase).mockReset().mockResolvedValue(detail)
  })

  it('shows the source metadata and allows downloading the original', async () => {
    const original = new Blob(['pdf'])
    vi.mocked(casesApi.downloadCaseDocument).mockResolvedValue(original)
    const user = userEvent.setup()
    renderPage('demo-1')
    expect(screen.getByText('Wniosek_demonstracyjny.pdf')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pobierz oryginał' }))
    expect(casesApi.downloadCaseDocument).toHaveBeenCalledWith(
      { caseId: 'demo-1', documentId: expect.any(String) },
      expect.anything(),
    )
    await waitFor(() =>
      expect(downloadBlob).toHaveBeenCalledWith(
        original,
        'Wniosek_demonstracyjny.pdf',
      ),
    )
    expect(
      screen.getByRole('link', { name: 'Przejdź do analizy' }),
    ).toHaveAttribute('href', '/sprawy/demo-1/analiza')
  })

  it('validates required fields', async () => {
    const user = userEvent.setup()
    renderPage('demo-1')
    await user.click(screen.getByRole('button', { name: 'Edytuj wniosek' }))
    await user.clear(screen.getByLabelText(/Wnioskodawca/))
    await user.type(screen.getByLabelText(/Wnioskodawca/), '   ')
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }))
    expect(screen.getByText('To pole jest wymagane.')).toBeInTheDocument()
  })

  it('changing the scope returns the case to analysis with a warning', async () => {
    const user = userEvent.setup()
    renderPage('demo-2')
    expect(screen.getByTestId('status')).toHaveTextContent('waiting')
    await user.click(screen.getByRole('button', { name: 'Edytuj wniosek' }))
    await user.type(screen.getByLabelText(/Treść wniosku/), ' Oraz faktur.')
    expect(
      screen.getByText(/Zmieniasz treść lub przedmiot wniosku/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      /sprawa wróciła do etapu analizy/,
    )
    expect(screen.getByTestId('status')).toHaveTextContent('analysis')
  })

  it('cancelling restores the saved data', async () => {
    const user = userEvent.setup()
    renderPage('demo-1')
    await user.click(screen.getByRole('button', { name: 'Edytuj wniosek' }))
    await user.clear(screen.getByLabelText(/Wnioskodawca/))
    await user.type(screen.getByLabelText(/Wnioskodawca/), 'Ktoś inny')
    await user.click(screen.getByRole('button', { name: 'Anuluj' }))
    expect(screen.getByText('Jan Demonstracyjny')).toBeInTheDocument()
  })

  it('a completed case is read-only', () => {
    renderPage('demo-10')
    expect(screen.getByText(/tylko do odczytu/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edytuj wniosek' }),
    ).not.toBeInTheDocument()
  })

  it('allows saving a case without the optional writing date', async () => {
    cases[0].writtenAt = ''
    const user = userEvent.setup()
    renderPage('demo-1')
    await user.click(screen.getByRole('button', { name: 'Edytuj wniosek' }))
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }))
    expect(screen.getByText('Zapisano zmiany we wniosku.')).toBeInTheDocument()
  })

  it('invalidates the review and marks the draft stale after the applicant changes', async () => {
    cases[0] = {
      ...cases[0],
      status: 'redaction',
      responseText: 'Do: Jan Demonstracyjny',
      redactions: [{ id: 'r', text: 'Jan', reason: '', decision: 'hide' }],
      redactionConfirmed: true,
    }
    const user = userEvent.setup()
    renderPage('demo-1')
    await user.click(screen.getByRole('button', { name: 'Edytuj wniosek' }))
    await user.clear(screen.getByLabelText(/Wnioskodawca/))
    await user.type(screen.getByLabelText(/Wnioskodawca/), 'Anna Testowa')
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }))
    expect(readSavedCase(cases[0])).toMatchObject({
      status: 'waiting',
      responseText: 'Do: Jan Demonstracyjny',
      redactions: [],
      redactionConfirmed: false,
    })
    expect(
      screen.getByText(/Dane wnioskodawcy zmieniły się/),
    ).toBeInTheDocument()
  })

  it('requires a question review also when the request changes during analysis', async () => {
    const user = userEvent.setup()
    renderPage('demo-1')
    await user.click(screen.getByRole('button', { name: 'Edytuj wniosek' }))
    await user.type(screen.getByLabelText(/Treść wniosku/), ' Nowe pytanie.')
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }))
    expect(readSavedCase(cases[0])).toMatchObject({
      status: 'analysis',
      analysisNeedsReview: true,
    })
  })
})
