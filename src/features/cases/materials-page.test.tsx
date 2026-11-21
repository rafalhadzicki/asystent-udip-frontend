import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoCases, createDemoKnowledge } from '@/features/demo/demo-data'
import {
  DEMO_STORAGE_KEY,
  DemoProvider,
  useDemoStore,
} from '@/features/demo/demo-store'
import type { CaseItem } from '@/features/demo/types'
import { MaterialsPage } from './materials-page'

const CaseOutlet = () => {
  const { cases } = useDemoStore()
  return <Outlet context={cases[0]} />
}

const renderPage = (changes: Partial<CaseItem> = {}) => {
  const cases = createDemoCases()
  cases[0] = { ...cases[0], ...changes }
  localStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify({ version: 1, cases, knowledge: createDemoKnowledge() }),
  )
  return render(
    <DemoProvider>
      <MemoryRouter initialEntries={['/sprawy/demo-1/materialy']}>
        <Routes>
          <Route path="/sprawy/demo-1" element={<CaseOutlet />}>
            <Route path="materialy" element={<MaterialsPage />} />
            <Route
              path="anonimizacja"
              element={<div>Anonimizacja testowa</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </DemoProvider>,
  )
}

const savedCase = (): CaseItem =>
  JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || '{}')
    .cases[0] as CaseItem

describe('MaterialsPage', () => {
  beforeEach(() => localStorage.clear())

  it('does not create a response when materials are received and requires entered content', async () => {
    const user = userEvent.setup()
    renderPage({
      materials: [
        {
          id: 'm',
          name: 'dane.pdf',
          size: 10,
          unit: 'ZDMiKP',
          addedAt: '2026-11-21',
        },
      ],
    })
    expect(screen.getByText('Materiały otrzymane')).toBeInTheDocument()
    expect(screen.getByLabelText('Treść odpowiedzi')).toHaveValue('')
    expect(screen.getByLabelText('Treść odpowiedzi')).toHaveAttribute(
      'readonly',
    )
    await user.click(screen.getByRole('button', { name: 'Generuj projekt' }))
    expect(
      screen.getByText(
        'Wpisz lub wklej treść materiałów przed wygenerowaniem projektu.',
      ),
    ).toBeInTheDocument()
    expect(savedCase().responseText).toBe('')
    expect(
      screen.getByRole('button', { name: 'Przejdź do anonimizacji' }),
    ).toBeDisabled()
  })

  it('generates only from selected scope and entered material, then saves exactly that response', async () => {
    const user = userEvent.setup()
    renderPage({
      questions: [
        { id: 'one', text: 'Zakres pierwszy', selected: true },
        { id: 'two', text: 'Zakres pominięty', selected: false },
      ],
    })
    fireEvent.change(screen.getByLabelText('Treść materiałów'), {
      target: { value: 'Informacja z wydziału.' },
    })
    await user.click(screen.getByRole('button', { name: 'Generuj projekt' }))
    expect(
      screen.getByRole('button', { name: /Generowanie projektu/ }),
    ).toBeDisabled()
    await waitFor(() =>
      expect(
        (screen.getByLabelText('Treść odpowiedzi') as HTMLTextAreaElement)
          .value,
      ).toContain('Informacja z wydziału.'),
    )
    const response = screen.getByLabelText(
      'Treść odpowiedzi',
    ) as HTMLTextAreaElement
    expect(response.value).toContain('Zakres pierwszy')
    expect(response.value).not.toContain('Zakres pominięty')
    expect(response.value).toContain('Jan Demonstracyjny')
    await waitFor(() => expect(savedCase().responseText).toBe(response.value))
    expect(savedCase().status).toBe('draft')
    await user.click(
      screen.getByRole('link', { name: 'Przejdź do anonimizacji' }),
    )
    expect(screen.getByText('Anonimizacja testowa')).toBeInTheDocument()
  })

  it('preserves stale edits and invalidates decisions after changing materials', async () => {
    const user = userEvent.setup()
    renderPage({
      status: 'redaction',
      responseText: 'Moja ręcznie poprawiona odpowiedź',
      materialNotes: 'Poprzednie materiały',
      redactions: [{ id: 'r', text: 'Jan', reason: 'Dane', decision: 'hide' }],
      redactionConfirmed: true,
    })
    fireEvent.change(screen.getByLabelText('Treść materiałów'), {
      target: { value: 'Nowe materiały' },
    })
    expect(
      screen.getByText(/Dotychczasowa treść została zachowana/),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Treść odpowiedzi')).toHaveValue(
      'Moja ręcznie poprawiona odpowiedź',
    )
    expect(
      screen.getByRole('button', { name: 'Przejdź do anonimizacji' }),
    ).toBeDisabled()
    await waitFor(() => expect(savedCase().redactionConfirmed).toBe(false))
    expect(savedCase().redactions).toEqual([])
    await user.click(
      screen.getByRole('button', { name: 'Zapisz wersję roboczą' }),
    )
    expect(
      screen.getByRole('link', { name: 'Przejdź do anonimizacji' }),
    ).toBeInTheDocument()
    expect(savedCase().status).toBe('draft')
  })

  it('cancels a pending generation when notes change', async () => {
    const user = userEvent.setup()
    renderPage({ materialNotes: 'Pierwsza treść' })
    await user.click(screen.getByRole('button', { name: 'Generuj projekt' }))
    fireEvent.change(screen.getByLabelText('Treść materiałów'), {
      target: { value: 'Nowa treść' },
    })
    await new Promise((resolve) => setTimeout(resolve, 900))
    expect(screen.getByLabelText('Treść odpowiedzi')).toHaveValue('')
    expect(savedCase().materialNotes).toBe('Nowa treść')
    expect(savedCase().responseText).toBe('')
  })

  it('records an externally sent inquiry and keeps a changed response only after confirmation', async () => {
    const user = userEvent.setup()
    renderPage({ responseText: 'Odpowiedź do zachowania', status: 'draft' })
    fireEvent.change(screen.getByLabelText('Data wysłania zapytań'), {
      target: { value: '2026-11-20' },
    })
    await user.click(
      screen.getByRole('button', { name: 'Oznacz zapytania jako wysłane' }),
    )
    await waitFor(() => expect(savedCase().contactedAt).toBe('2026-11-20'))
    expect(savedCase().status).toBe('waiting')
    expect(savedCase().responseText).toBe('Odpowiedź do zachowania')
    expect(
      screen.getByRole('button', { name: 'Przejdź do anonimizacji' }),
    ).toBeDisabled()
  })

  it('validates files and stores only metadata with the selected unit', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const { container } = renderPage()
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')
    expect(input).not.toBeNull()
    await user.upload(
      input!,
      new File(['abc'], 'dane.pdf', { type: 'application/pdf' }),
    )
    expect(
      screen.getByText('Wybierz jednostkę przekazującą materiał.'),
    ).toBeInTheDocument()
    await user.click(screen.getByLabelText('Jednostka przekazująca materiał'))
    await user.click(screen.getByRole('option', { name: 'ZDMiKP' }))
    await user.upload(
      input!,
      new File(['abc'], 'dane.exe', { type: 'application/octet-stream' }),
    )
    expect(screen.getByText(/Nieobsługiwany format pliku/)).toBeInTheDocument()
    await user.upload(
      input!,
      new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'duzy.txt', {
        type: 'text/plain',
      }),
    )
    expect(screen.getByText('Plik przekracza limit 25 MB.')).toBeInTheDocument()
    await user.upload(
      input!,
      new File(['abc'], 'dane.pdf', { type: 'application/pdf' }),
    )
    expect(screen.getByText('dane.pdf')).toBeInTheDocument()
    await waitFor(() => expect(savedCase().materials).toHaveLength(1))
    expect(savedCase().materials[0]).toMatchObject({
      name: 'dane.pdf',
      size: 3,
      unit: 'ZDMiKP',
    })
    expect(JSON.stringify(savedCase().materials)).not.toContain('abc')
    expect(savedCase().responseText).toBe('')
  })

  it('clears redaction decisions on response editing and asks before replacement', async () => {
    const user = userEvent.setup()
    renderPage({
      status: 'redaction',
      responseText: 'Oryginalny projekt',
      materialNotes: 'Treść materiału',
      redactions: [{ id: 'r', text: 'Jan', reason: 'Dane', decision: 'hide' }],
      redactionConfirmed: true,
    })
    fireEvent.change(screen.getByLabelText('Treść odpowiedzi'), {
      target: { value: 'Projekt po zmianie' },
    })
    await waitFor(() => expect(savedCase().redactions).toEqual([]))
    expect(savedCase().redactionConfirmed).toBe(false)
    expect(savedCase().responseText).toBe('Projekt po zmianie')
    await user.click(screen.getByRole('button', { name: 'Generuj projekt' }))
    expect(screen.getByText(/zastąpi obecną treść/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Anuluj' }))
    expect(screen.getByLabelText('Treść odpowiedzi')).toHaveValue(
      'Projekt po zmianie',
    )
  })

  it('does not permit editing a completed case', () => {
    renderPage({ status: 'completed', responseText: 'Zakończona odpowiedź' })
    expect(screen.getByLabelText('Treść odpowiedzi')).toHaveAttribute(
      'readonly',
    )
    expect(screen.getByLabelText('Treść materiałów')).toHaveAttribute(
      'readonly',
    )
    expect(
      screen.queryByRole('button', { name: 'Generuj projekt' }),
    ).not.toBeInTheDocument()
  })
})
