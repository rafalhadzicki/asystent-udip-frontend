import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as casesApi from '@/api/cases/cases.api'
import { theme } from '@/app/theme'
import { DemoProvider } from '@/features/demo/demo-store'
import { detail } from '@/test/case-detail'
import { createTestQueryClient } from '@/test/query-client'
import { composeApiCase } from '../case-from-api'
import { RequestPage } from './request-page'

vi.mock('@/api/cases/cases.api', () => ({ updateCase: vi.fn() }))

const renderPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={createTestQueryClient()}>
        <DemoProvider>
          <MemoryRouter initialEntries={['/sprawy/case-1/wniosek']}>
            <Routes>
              <Route
                path="/sprawy/:caseId"
                element={<Outlet context={composeApiCase(detail)} />}
              >
                <Route path="wniosek" element={<RequestPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </DemoProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  )

const conflict = () =>
  new AxiosError('Conflict', undefined, undefined, null, {
    data: {},
    status: 409,
    statusText: 'Conflict',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

afterEach(() => localStorage.clear())

describe('RequestPage for a case from the API', () => {
  it('saves server fields through the API and leaves the deadline to the backend', async () => {
    vi.mocked(casesApi.updateCase).mockResolvedValue(detail)
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Edytuj wniosek' }))
    expect(screen.getByLabelText(/Termin odpowiedzi/)).toBeDisabled()
    expect(screen.getByText(/Termin liczy serwer/)).toBeInTheDocument()
    const subject = screen.getByLabelText(/Przedmiot wniosku/)
    await user.clear(subject)
    await user.type(subject, 'Zmieniony temat')
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }))
    expect(await screen.findByText(/Zapisano zmiany/)).toBeInTheDocument()
    expect(casesApi.updateCase).toHaveBeenCalledOnce()
    expect(vi.mocked(casesApi.updateCase).mock.calls[0][0]).toMatchObject({
      id: 'case-1',
      caseNumber: 'BKS.IV.1431.1.2026',
      subject: 'Zmieniony temat',
      requesterName: 'Jan Testowy',
      requestText: 'Treść wniosku',
    })
  })

  it('shows a taken reference reported by the backend', async () => {
    vi.mocked(casesApi.updateCase).mockRejectedValue(conflict())
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Edytuj wniosek' }))
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }))
    expect(
      await screen.findByText('Sprawa o tej sygnaturze już istnieje.'),
    ).toBeInTheDocument()
  })

  it('keeps the form open and reports a failed save', async () => {
    vi.mocked(casesApi.updateCase).mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Edytuj wniosek' }))
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }))
    expect(
      await screen.findByText(/Nie udało się zapisać zmian w API/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Zapisz zmiany' }),
    ).toBeInTheDocument()
  })
})
