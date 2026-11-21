import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { theme } from '@/app/theme'
import { createDemoCases, createDemoKnowledge } from '@/features/demo/demo-data'
import {
  DEMO_STORAGE_KEY,
  DemoProvider,
  useDemoStore,
} from '@/features/demo/demo-store'
import { RedactionPage } from './redaction-page'

const CurrentCase = () => {
  const { cases } = useDemoStore()
  return <Outlet context={cases[0]} />
}

const renderPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <DemoProvider>
        <MemoryRouter initialEntries={['/anonimizacja']}>
          <Routes>
            <Route element={<CurrentCase />}>
              <Route path="/anonimizacja" element={<RedactionPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </DemoProvider>
    </ThemeProvider>,
  )

beforeEach(() => {
  const cases = createDemoCases()
  cases[0] = {
    ...cases[0],
    status: 'draft',
    responseText:
      'Do: Jan Demonstracyjny\nKwota: 123 zł.\nJan Demonstracyjny otrzymuje odpowiedź.',
  }
  localStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify({
      version: 1,
      cases,
      knowledge: createDemoKnowledge(),
    }),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('redaction workflow', () => {
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
    renderPage()
    const download = screen.getByRole('button', {
      name: 'Pobierz zanonimizowany tekst TXT',
    })
    expect(download).toBeDisabled()
    await user.click(
      screen.getByRole('button', { name: 'Uruchom analizę demonstracyjną' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Ukryj w pobranym tekście' }),
    )
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
    await user.click(screen.getByRole('button', { name: 'Pozostaw' }))
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
        name: 'Uruchom analizę demonstracyjną',
      }),
    ).toBeDisabled()
  })
})
