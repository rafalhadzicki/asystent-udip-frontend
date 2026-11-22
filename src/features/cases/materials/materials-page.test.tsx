import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as casesApi from '@/api/cases/cases.api'
import { createTestQueryClient } from '@/test/query-client'
import { detail } from '@/test/case-detail'
import { createDemoCases } from '@/test/demo-cases'
import { LocalStoreProvider } from '@/features/cases/local-store'
import { TestCaseOutlet } from '@/test/case-outlet'
import { readSavedCase } from '@/test/saved-case'
import type { CaseItem } from '@/features/cases/types'
import { MaterialsPage } from './materials-page'

vi.mock('@/api/cases/cases.api', () => ({
  uploadCaseDocument: vi.fn(),
  deleteCaseDocument: vi.fn(),
  draftResponse: vi.fn(),
  changeCaseStatus: vi.fn(),
}))

let current: CaseItem

const CaseOutlet = () => <TestCaseOutlet item={current} />

const renderPage = (changes: Partial<CaseItem> = {}) => {
  current = { ...createDemoCases()[0], ...changes }
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <LocalStoreProvider>
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
      </LocalStoreProvider>
    </QueryClientProvider>,
  )
}

const savedCase = () => readSavedCase(current)

describe('MaterialsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(casesApi.uploadCaseDocument).mockReset()
    vi.mocked(casesApi.deleteCaseDocument).mockReset()
    vi.mocked(casesApi.draftResponse).mockReset()
    vi.mocked(casesApi.changeCaseStatus).mockReset().mockResolvedValue(detail)
  })

  it('blokuje dalszą pracę do czasu przeglądu zmienionego wniosku', () => {
    renderPage({ analysisNeedsReview: true })
    expect(screen.getByText(/Przed dalszą pracą przejrzyj/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Przejdź do analizy' }),
    ).toHaveAttribute('href', '/sprawy/demo-1/analiza')
    expect(
      screen.queryByRole('button', { name: 'Generuj projekt' }),
    ).not.toBeInTheDocument()
  })

  it('does not create a response without materials and notes', async () => {
    const user = userEvent.setup()
    renderPage({ materials: [], materialNotes: '' })
    expect(screen.getByText('Oczekiwanie na materiały')).toBeInTheDocument()
    expect(screen.getByLabelText('Treść odpowiedzi')).toHaveValue('')
    expect(screen.getByLabelText('Treść odpowiedzi')).toHaveAttribute(
      'readonly',
    )
    await user.click(screen.getByRole('button', { name: 'Generuj projekt' }))
    expect(
      screen.getByText(/Dodaj materiał z jednostki albo wpisz/),
    ).toBeInTheDocument()
    expect(casesApi.draftResponse).not.toHaveBeenCalled()
    expect(savedCase().responseText).toBe('')
    expect(
      screen.getByRole('button', { name: 'Przejdź do anonimizacji' }),
    ).toBeDisabled()
  })

  it('generates the draft on the server, shows its sources and saves exactly that response', async () => {
    vi.mocked(casesApi.draftResponse).mockResolvedValue({
      text: 'Szkic z serwera [UZUPEŁNIJ: data]',
      sources: [
        {
          kind: 'KNOWLEDGE',
          documentId: 'k-1',
          documentName: 'Ustawa o dostępie',
          category: 'LAW',
          excerpt: 'Art. 1 ust. 1',
        },
      ],
    })
    const user = userEvent.setup()
    renderPage()
    fireEvent.change(screen.getByLabelText('Treść materiałów'), {
      target: { value: 'Informacja z wydziału.' },
    })
    await user.click(screen.getByRole('button', { name: 'Generuj projekt' }))
    expect(
      await screen.findByDisplayValue('Szkic z serwera [UZUPEŁNIJ: data]'),
    ).toBeInTheDocument()
    expect(vi.mocked(casesApi.draftResponse).mock.calls[0][0]).toEqual({
      id: 'demo-1',
      notes: 'Informacja z wydziału.',
    })
    expect(screen.getByText('Ustawa o dostępie')).toBeInTheDocument()
    expect(screen.getByText(/Art\. 1 ust\. 1/)).toBeInTheDocument()
    await waitFor(() =>
      expect(savedCase().responseText).toBe(
        'Szkic z serwera [UZUPEŁNIJ: data]',
      ),
    )
    expect(savedCase().status).toBe('draft')
    await user.click(
      screen.getByRole('link', { name: 'Przejdź do anonimizacji' }),
    )
    expect(screen.getByText('Anonimizacja testowa')).toBeInTheDocument()
  })

  it('shows a message when the AI is not configured', async () => {
    vi.mocked(casesApi.draftResponse).mockRejectedValue(
      new AxiosError('x', undefined, undefined, null, {
        data: { code: 'AI_NOT_CONFIGURED' },
        status: 503,
        statusText: 'Service Unavailable',
        headers: {},
        config: { headers: new AxiosHeaders() },
      }),
    )
    const user = userEvent.setup()
    renderPage({ materialNotes: 'Treść' })
    await user.click(screen.getByRole('button', { name: 'Generuj projekt' }))
    expect(
      await screen.findByText(/Funkcje AI są obecnie niedostępne/),
    ).toBeInTheDocument()
    expect(savedCase().responseText).toBe('')
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
      await screen.findByRole('link', { name: 'Przejdź do anonimizacji' }),
    ).toBeInTheDocument()
    expect(savedCase().status).toBe('draft')
    expect(vi.mocked(casesApi.changeCaseStatus).mock.calls[0][0]).toEqual({
      id: current.id,
      status: 'RESPONSE_PREPARED',
    })
  })

  it('keeps the draft unsaved when the case status cannot be updated', async () => {
    vi.mocked(casesApi.changeCaseStatus).mockRejectedValue(new Error('500'))
    const user = userEvent.setup()
    renderPage({ responseText: 'Moja odpowiedź', status: 'waiting' })
    await user.click(
      screen.getByRole('button', { name: 'Zapisz wersję roboczą' }),
    )
    expect(
      await screen.findByText(
        'Nie udało się zapisać etapu sprawy. Spróbuj ponownie.',
      ),
    ).toBeInTheDocument()
    expect(savedCase().status).toBe('waiting')
  })

  it('ignores a generation finished after the notes changed', async () => {
    let finish: (value: { text: string; sources: [] }) => void = () => undefined
    vi.mocked(casesApi.draftResponse).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const user = userEvent.setup()
    renderPage({ materialNotes: 'Pierwsza treść' })
    await user.click(screen.getByRole('button', { name: 'Generuj projekt' }))
    fireEvent.change(screen.getByLabelText('Treść materiałów'), {
      target: { value: 'Nowa treść' },
    })
    finish({ text: 'Spóźniony szkic', sources: [] })
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(screen.getByLabelText('Treść odpowiedzi')).toHaveValue('')
    expect(savedCase().materialNotes).toBe('Nowa treść')
    expect(savedCase().responseText).toBe('')
  })

  it('validates files and sends them to the server with the selected unit', async () => {
    vi.mocked(casesApi.uploadCaseDocument).mockResolvedValue({
      id: 'doc-9',
      kind: 'DEPARTMENT_RESPONSE',
      department: null,
      originalName: 'dane.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 3,
      textExtractionStatus: 'EXTRACTED',
      uploadedBy: { id: 'u', email: 'u@example.test' },
      createdAt: '2026-11-21T10:00:00.000Z',
    })
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
    expect(casesApi.uploadCaseDocument).not.toHaveBeenCalled()
    await user.upload(
      input!,
      new File(['abc'], 'dane.pdf', { type: 'application/pdf' }),
    )
    await waitFor(() => expect(casesApi.uploadCaseDocument).toHaveBeenCalled())
    const sent = vi.mocked(casesApi.uploadCaseDocument).mock.calls[0][0]
    expect(sent).toMatchObject({
      caseId: 'demo-1',
      kind: 'DEPARTMENT_RESPONSE',
    })
    expect(sent.departmentId).toEqual(expect.any(String))
    expect(sent.file.name).toBe('dane.pdf')
    await waitFor(() => expect(savedCase().status).toBe('waiting'))
    expect(savedCase().responseText).toBe('')
  })

  it('removes a material on the server', async () => {
    vi.mocked(casesApi.deleteCaseDocument).mockResolvedValue()
    const user = userEvent.setup()
    renderPage({
      materials: [
        {
          id: 'm1',
          name: 'dane.pdf',
          size: 10,
          unit: 'ZDMiKP',
          addedAt: '2026-11-21',
        },
      ],
    })
    await user.click(
      screen.getByRole('button', { name: 'Usuń materiał dane.pdf' }),
    )
    await waitFor(() => expect(casesApi.deleteCaseDocument).toHaveBeenCalled())
    expect(vi.mocked(casesApi.deleteCaseDocument).mock.calls[0][0]).toEqual({
      caseId: 'demo-1',
      documentId: 'm1',
    })
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
