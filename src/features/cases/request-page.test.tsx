import { ThemeProvider } from '@mui/material/styles'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  MemoryRouter,
  Outlet,
  Route,
  Routes,
  useParams,
} from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { theme } from '@/app/theme'
import { DemoProvider, useDemoStore } from '@/features/demo/demo-store'
import { RequestPage } from './request-page'

const CaseOutlet = () => {
  const { caseId } = useParams()
  const item = useDemoStore().cases.find((c) => c.id === caseId)
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
      <DemoProvider>
        <MemoryRouter initialEntries={[`/sprawy/${caseId}/wniosek`]}>
          <Routes>
            <Route path="/sprawy/:caseId" element={<CaseOutlet />}>
              <Route path="wniosek" element={<RequestPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </DemoProvider>
    </ThemeProvider>,
  )

describe('RequestPage', () => {
  beforeEach(() => localStorage.clear())

  it('pokazuje metadane źródła i uczciwą informację o pliku', () => {
    renderPage('demo-1')
    expect(screen.getByText('Wniosek_demonstracyjny.pdf')).toBeInTheDocument()
    expect(
      screen.getByText(/oryginalny plik nie jest przechowywany/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Przejdź do analizy' }),
    ).toHaveAttribute('href', '/sprawy/demo-1/analiza')
  })

  it('waliduje wymagane pola i unikalność sygnatury', async () => {
    const user = userEvent.setup()
    renderPage('demo-1')
    await user.click(screen.getByRole('button', { name: 'Edytuj wniosek' }))
    await user.clear(screen.getByLabelText(/Wnioskodawca/))
    await user.type(screen.getByLabelText(/Wnioskodawca/), '   ')
    const reference = screen.getByLabelText(/Sygnatura/)
    await user.clear(reference)
    await user.type(reference, 'UDIP/2026/0159')
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }))
    expect(screen.getByText('To pole jest wymagane.')).toBeInTheDocument()
    expect(
      screen.getByText('Sprawa o tej sygnaturze już istnieje.'),
    ).toBeInTheDocument()
  })

  it('proponuje termin tylko po potwierdzeniu i zapisuje metadane', async () => {
    const user = userEvent.setup()
    renderPage('demo-1')
    await user.click(screen.getByRole('button', { name: 'Edytuj wniosek' }))
    expect(screen.getByLabelText(/Termin odpowiedzi/)).toHaveValue('2026-11-19')
    expect(
      screen.queryByRole('button', { name: /Ustaw proponowany termin/ }),
    ).not.toBeInTheDocument()
    await user.clear(screen.getByLabelText(/Data wpływu/))
    await user.type(screen.getByLabelText(/Data wpływu/), '2026-11-06')
    expect(screen.getByLabelText(/Termin odpowiedzi/)).toHaveValue('2026-11-19')
    await user.click(
      screen.getByRole('button', {
        name: 'Ustaw proponowany termin 20.11.2026',
      }),
    )
    expect(screen.getByLabelText(/Termin odpowiedzi/)).toHaveValue('2026-11-20')
    await user.click(screen.getByRole('button', { name: 'Zapisz zmiany' }))
    expect(screen.getByRole('status')).toHaveTextContent(
      'Zapisano zmiany we wniosku.',
    )
    expect(screen.getByText('20.11.2026')).toBeInTheDocument()
    expect(screen.getByTestId('status')).toHaveTextContent('analysis')
  })

  it('zmiana zakresu cofa sprawę do analizy z ostrzeżeniem', async () => {
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

  it('anulowanie przywraca zapisane dane', async () => {
    const user = userEvent.setup()
    renderPage('demo-1')
    await user.click(screen.getByRole('button', { name: 'Edytuj wniosek' }))
    await user.clear(screen.getByLabelText(/Wnioskodawca/))
    await user.type(screen.getByLabelText(/Wnioskodawca/), 'Ktoś inny')
    await user.click(screen.getByRole('button', { name: 'Anuluj' }))
    expect(screen.getByText('Jan Demonstracyjny')).toBeInTheDocument()
  })

  it('zakończona sprawa jest tylko do odczytu', () => {
    renderPage('demo-10')
    expect(screen.getByText(/tylko do odczytu/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Edytuj wniosek' }),
    ).not.toBeInTheDocument()
  })
})
