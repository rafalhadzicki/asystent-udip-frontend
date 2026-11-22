import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as casesApi from '@/api/cases/cases.api'
import { createTestQueryClient } from '@/test/query-client'
import { theme } from '@/app/theme'
import { createDemoCases } from '@/features/demo/demo-data'
import {
  DEMO_STORAGE_KEY,
  DemoProvider,
  useDemoStore,
} from '@/features/demo/demo-store'
import { RedactionPage } from './redaction-page'

vi.mock('@/api/cases/cases.api', () => ({
  getRedactionSuggestions: vi.fn(),
}))

const suggest = (...texts: string[]) =>
  vi.mocked(casesApi.getRedactionSuggestions).mockResolvedValue({
    suggestions: texts.map((text) => ({
      text,
      category: 'PERSON_NAME' as const,
      reason: 'Dane osobowe wnioskodawcy',
    })),
  })

const CurrentCase = () => {
  const { cases } = useDemoStore()
  return <Outlet context={cases[0]} />
}

const renderPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={createTestQueryClient()}>
        <DemoProvider>
          <MemoryRouter initialEntries={['/anonimizacja']}>
            <Routes>
              <Route element={<CurrentCase />}>
                <Route path="/anonimizacja" element={<RedactionPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </DemoProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  )

beforeEach(() => {
  const cases = createDemoCases()
  cases[0] = {
    ...cases[0],
    status: 'draft',
    responseText:
      'Do: Jan Demonstracyjny\nKwota: 123 zł.\nJAN DEMONSTRACYJNY otrzymuje odpowiedź.',
  }
  localStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      cases,
    }),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('redaction workflow', () => {
  it('blocks redaction until a changed request has been reviewed', () => {
    const snapshot = JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)!)
    snapshot.cases[0].analysisNeedsReview = true
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(snapshot))
    renderPage()
    expect(screen.getByText(/Przed dalszą pracą przejrzyj/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Przejdź do analizy' }),
    ).toHaveAttribute('href', '/sprawy/demo-1/analiza')
    expect(
      screen.queryByRole('button', {
        name: 'Pobierz zanonimizowany tekst TXT',
      }),
    ).not.toBeInTheDocument()
  })

  it('exports actual TXT bytes with every approved occurrence removed and invalidates review on changes', async () => {
    const user = userEvent.setup()
    const createObjectURL = vi.fn<(blob: Blob) => string>(
      () => 'blob:demo-export',
    )
    const revokeObjectURL = vi.fn()
    const NativeURL = URL
    vi.stubGlobal(
      'URL',
      class extends NativeURL {
        static createObjectURL = createObjectURL
        static revokeObjectURL = revokeObjectURL
      },
    )
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    suggest('Jan Demonstracyjny', 'JAN DEMONSTRACYJNY')
    renderPage()
    const download = screen.getByRole('button', {
      name: 'Pobierz zanonimizowany tekst TXT',
    })
    expect(download).toBeDisabled()
    await user.click(
      screen.getByRole('button', { name: 'Wyszukaj dane osobowe (AI)' }),
    )
    for (const button of screen.getAllByRole('button', {
      name: 'Ukryj w pobranym tekście',
    })) {
      await user.click(button)
    }
    await user.click(
      screen.getByRole('checkbox', { name: /Potwierdzam, że ręcznie/ }),
    )
    expect(download).toBeEnabled()
    expect(
      JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)!).cases[0].status,
    ).toBe('redaction')
    await user.click(download)

    const blob: Blob = createObjectURL.mock.calls[0][0]
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })
    expect(blob.type).toBe('text/plain;charset=utf-8')
    expect(text).toBe(
      'Do: [ZANONIMIZOWANO]\nKwota: 123 zł.\n[ZANONIMIZOWANO] otrzymuje odpowiedź.',
    )
    expect(click).toHaveBeenCalledOnce()
    await waitFor(
      () => expect(revokeObjectURL).toHaveBeenCalledWith('blob:demo-export'),
      { timeout: 2000 },
    )
    await user.click(screen.getAllByRole('button', { name: 'Pozostaw' })[0])
    expect(download).toBeDisabled()
    expect(
      screen.getByRole('checkbox', { name: /Potwierdzam, że ręcznie/ }),
    ).not.toBeChecked()
  })

  it('records a manually sent answer, persists completion and keeps completed content read-only', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(
      screen.getByRole('checkbox', { name: /Potwierdzam, że ręcznie/ }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Zapisz ręcznie odnotowaną wysyłkę' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Zapisz wysyłkę i zakończ sprawę' }),
    )
    expect(await screen.findByText(/Podaj datę/)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Data wysłania/), {
      target: { value: '2026-11-21' },
    })
    await user.type(
      screen.getByLabelText('Notatka (opcjonalnie)'),
      'Wysłano poza aplikacją — demo',
    )
    await user.click(
      screen.getByRole('button', { name: 'Zapisz wysyłkę i zakończ sprawę' }),
    )
    await waitFor(() => {
      expect(
        JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)!).cases[0],
      ).toMatchObject({
        status: 'completed',
        sentAt: '2026-11-21',
        sentNote: 'Wysłano poza aplikacją — demo',
      })
    })
    expect(
      await screen.findByRole('button', {
        name: 'Wyszukaj dane osobowe (AI)',
      }),
    ).toBeDisabled()
  })

  it('suggests case variants separately without hiding declined variants or inflections', async () => {
    const cases = createDemoCases()
    cases[0] = {
      ...cases[0],
      applicant: 'Żaneta Żółć',
      status: 'draft',
      responseText: 'Żaneta Żółć; ŻANETA ŻÓŁĆ; Żanecie Żółci',
    }
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({ version: 1, cases }),
    )
    suggest('Żaneta Żółć', 'ŻANETA ŻÓŁĆ')
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByText(/Sugestie AI mogą pominąć/)).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Wyszukaj dane osobowe (AI)' }),
    )
    expect(
      await screen.findByText(/Dodano sugestie do rozstrzygnięcia: 2/),
    ).toBeInTheDocument()
    expect(screen.getByText('Żaneta Żółć')).toBeInTheDocument()
    expect(screen.getByText('ŻANETA ŻÓŁĆ')).toBeInTheDocument()
    const hideButtons = screen.getAllByRole('button', {
      name: 'Ukryj w pobranym tekście',
    })
    await user.click(hideButtons[0])
    await user.click(screen.getAllByRole('button', { name: 'Pozostaw' })[1])
    expect(screen.getByLabelText('Podgląd odpowiedzi')).toHaveTextContent(
      '[ZANONIMIZOWANO]; ŻANETA ŻÓŁĆ; Żanecie Żółci',
    )
    await user.click(
      screen.getByRole('checkbox', { name: /Potwierdzam, że ręcznie/ }),
    )
    expect(
      screen.getByRole('button', {
        name: 'Pobierz zanonimizowany tekst TXT',
      }),
    ).toBeEnabled()
    await user.click(
      screen.getByRole('button', { name: 'Wyszukaj dane osobowe (AI)' }),
    )
    expect(
      await screen.findByText(/Dodano sugestii: 0. Pominięto/),
    ).toBeInTheDocument()
  })

  it('preserves previously saved exact decisions and confirmation', () => {
    const cases = createDemoCases()
    cases[0] = {
      ...cases[0],
      status: 'redaction',
      responseText: 'Jan i JAN',
      redactions: [{ id: 'legacy', text: 'Jan', reason: '', decision: 'hide' }],
      redactionConfirmed: true,
    }
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({ version: 1, cases }),
    )
    renderPage()
    expect(screen.getByLabelText('Podgląd odpowiedzi')).toHaveTextContent(
      '[ZANONIMIZOWANO] i JAN',
    )
    expect(
      screen.getByRole('checkbox', { name: /Potwierdzam, że ręcznie/ }),
    ).toBeChecked()
  })

  it('skips overlapping suggestions, adds other variants and resets review', async () => {
    const cases = createDemoCases()
    cases[0] = {
      ...cases[0],
      applicant: 'Jan Kowalski',
      status: 'redaction',
      responseText: 'Jan Kowalski; JAN KOWALSKI',
      redactions: [
        { id: 'existing', text: 'Jan', reason: '', decision: 'hide' },
      ],
      redactionConfirmed: true,
    }
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({ version: 1, cases }),
    )
    suggest('Jan Kowalski', 'JAN KOWALSKI')
    const user = userEvent.setup()
    renderPage()
    await user.click(
      screen.getByRole('button', { name: 'Wyszukaj dane osobowe (AI)' }),
    )
    expect(
      await screen.findByText(/Dodano sugestii: 1. Pominięto/),
    ).toBeInTheDocument()
    expect(screen.getByText('JAN KOWALSKI')).toBeInTheDocument()
    expect(
      screen.getByText(/Imię i nazwisko: Dane osobowe wnioskodawcy/),
    ).toBeInTheDocument()
    expect(screen.queryByText('Jan Kowalski')).not.toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: /Potwierdzam, że ręcznie/ }),
    ).not.toBeChecked()
    expect(
      screen.getByRole('button', { name: 'Pobierz zanonimizowany tekst TXT' }),
    ).toBeDisabled()
  })

  it('ignores suggestions that are not in the text and reports an AI that is not configured', async () => {
    const user = userEvent.setup()
    suggest('Tekst spoza odpowiedzi')
    renderPage()
    await user.click(
      screen.getByRole('button', { name: 'Wyszukaj dane osobowe (AI)' }),
    )
    expect(
      await screen.findByText(/Dodano sugestii: 0. Pominięto/),
    ).toBeInTheDocument()
    expect(screen.queryByText('Tekst spoza odpowiedzi')).not.toBeInTheDocument()

    vi.mocked(casesApi.getRedactionSuggestions).mockRejectedValue(
      new AxiosError('x', undefined, undefined, null, {
        data: { code: 'AI_NOT_CONFIGURED' },
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Wyszukaj dane osobowe (AI)' }),
    )
    expect(
      await screen.findByText(/Funkcje AI nie są skonfigurowane/),
    ).toBeInTheDocument()
  })

  it('lets the user undo a decision by clicking the selected option again', async () => {
    const user = userEvent.setup()
    suggest('Jan Kowalski')
    renderPage()
    await user.click(
      screen.getByRole('button', { name: 'Wyszukaj dane osobowe (AI)' }),
    )
    const hide = await screen.findByRole('button', {
      name: 'Ukryj w pobranym tekście',
    })
    await user.click(hide)
    expect(hide).toHaveAttribute('aria-pressed', 'true')
    await user.click(hide)
    expect(hide).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Pozostaw' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
