import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDemoCases } from '@/test/demo-cases'
import { LocalStoreProvider } from '@/features/cases/local-store'
import { TestCaseOutlet } from '@/test/case-outlet'
import { readSavedCase } from '@/test/saved-case'
import type { KnowledgeMatch } from '@/api/knowledge/knowledge.schemas'
import type { CaseItem } from '@/features/cases/types'
import { AnalysisPage } from './analysis-page'
import * as knowledgeApi from '@/api/knowledge/knowledge.api'
import * as departmentApi from '@/api/departments/departments.api'
import * as casesApi from '@/api/cases/cases.api'
import { composeApiCase } from '@/features/cases/case-from-api'
import { detail } from '@/test/case-detail'
import { createTestQueryClient } from '@/test/query-client'

vi.mock('@/api/cases/cases.api', () => ({
  setCaseQuestions: vi.fn(),
  setCaseDepartments: vi.fn(),
  changeCaseStatus: vi.fn(),
}))

vi.mock('@/api/knowledge/knowledge.api', () => ({
  searchKnowledge: vi.fn().mockResolvedValue({ matches: [] }),
  getKnowledgeDocument: vi.fn().mockResolvedValue({
    id: 'x',
    name: 'Przykład',
    category: 'RESPONSE',
    originalName: 'odpowiedz.txt',
    mimeType: 'text/plain',
    sizeBytes: 10,
    textExtractionStatus: 'EXTRACTED',
    indexStatus: 'INDEXED',
    chunkCount: 1,
    uploadedBy: { id: 'u', email: 'u@example.test' },
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    extractedText: 'Treść wzoru',
  }),
}))

vi.mock('@/api/departments/departments.api', () => ({
  getDepartments: vi.fn().mockResolvedValue([]),
}))

let current: CaseItem

const CaseOutlet = () => <TestCaseOutlet item={current} />

const renderPage = (item: CaseItem) => {
  current = item
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <LocalStoreProvider>
        <MemoryRouter initialEntries={[`/sprawy/${item.id}/analiza`]}>
          <Routes>
            <Route path="/sprawy/:caseId" element={<CaseOutlet />}>
              <Route path="analiza" element={<AnalysisPage />} />
              <Route path="materialy" element={<div>Etap materiałów</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </LocalStoreProvider>
    </QueryClientProvider>,
  )
}

const renderRemote = (item: CaseItem) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <LocalStoreProvider>
        <MemoryRouter initialEntries={['/sprawy/x/analiza']}>
          <Routes>
            <Route path="/sprawy/:caseId" element={<Outlet context={item} />}>
              <Route path="analiza" element={<AnalysisPage />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </LocalStoreProvider>
    </QueryClientProvider>,
  )

const savedCase = () => readSavedCase(current)

describe('analiza sprawy', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(casesApi.setCaseQuestions).mockReset().mockResolvedValue(detail)
    vi.mocked(casesApi.setCaseDepartments).mockReset().mockResolvedValue(detail)
    vi.mocked(casesApi.changeCaseStatus).mockReset().mockResolvedValue(detail)
    vi.mocked(departmentApi.getDepartments).mockReset().mockResolvedValue([])
    vi.mocked(knowledgeApi.searchKnowledge)
      .mockReset()
      .mockResolvedValue({ matches: [] })
  })

  it('podpowiada jednostki z API i zapisuje wybór lokalnie', async () => {
    vi.mocked(departmentApi.getDepartments).mockResolvedValue([
      {
        id: 'api-unit',
        name: 'Wydział testowy',
        symbol: 'WT',
        kind: 'DEPARTMENT',
        isActive: true,
      },
      {
        id: 'inactive-unit',
        name: 'Wydział wygaszony',
        symbol: 'WW',
        kind: 'DEPARTMENT',
        isActive: false,
      },
    ])
    const user = userEvent.setup()
    renderPage(createDemoCases()[0])
    await waitFor(() => expect(departmentApi.getDepartments).toHaveBeenCalled())
    await waitFor(() =>
      expect(
        document.querySelector('#department-options option'),
      ).toHaveAttribute('value', 'Wydział testowy'),
    )
    expect(
      [...document.querySelectorAll('#department-options option')].map(
        (option) => option.getAttribute('value'),
      ),
    ).toEqual(['Wydział testowy'])
    await user.type(screen.getByLabelText('Nazwa jednostki'), 'Wydział testowy')
    await user.click(screen.getByRole('button', { name: 'Dodaj jednostkę' }))
    await user.click(screen.getByRole('button', { name: 'Zapisz ustalenia' }))
    await waitFor(() =>
      expect(casesApi.setCaseDepartments).toHaveBeenCalledWith(
        expect.objectContaining({
          departmentIds: expect.arrayContaining(['api-unit']),
        }),
        expect.anything(),
      ),
    )
    expect(
      screen.getByText(/Podpowiedzi pochodzą ze słownika jednostek/),
    ).toBeInTheDocument()
  })

  it('informuje o błędzie pobierania jednostek', async () => {
    vi.mocked(departmentApi.getDepartments).mockRejectedValue(
      new Error('network'),
    )
    renderPage(createDemoCases()[0])
    expect(
      await screen.findByText(/Nie udało się pobrać listy jednostek/),
    ).toBeInTheDocument()
  })

  it('requires a nonempty selected question and a selected department before continuing', async () => {
    const user = userEvent.setup()
    const item = createDemoCases()[0]
    item.questions = [{ id: 'q', text: '', selected: true }]
    item.departments = item.departments.map((department) => ({
      ...department,
      selected: false,
    }))
    renderPage(item)

    await user.click(
      screen.getByRole('button', { name: 'Zapisz i przejdź do materiałów' }),
    )
    expect(
      screen.getByText(/Wybierz co najmniej jedno pytanie/),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Wybierz co najmniej jedną jednostkę.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Etap materiałów')).not.toBeInTheDocument()
    await user.type(screen.getByLabelText('Treść pytania 1'), 'Dokumenty')
    await user.click(
      screen.getByRole('checkbox', { name: 'Wybierz jednostkę ZDMiKP' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Zapisz i przejdź do materiałów' }),
    )
    expect(screen.getByText('Etap materiałów')).toBeInTheDocument()
    await waitFor(() => expect(savedCase().status).toBe('waiting'))
    expect(
      vi.mocked(casesApi.setCaseQuestions).mock.calls[0][0].questions[0].text,
    ).toBe('Dokumenty')
    expect(vi.mocked(casesApi.changeCaseStatus).mock.calls[0][0]).toEqual({
      id: item.id,
      status: 'SENT_TO_DEPARTMENTS',
    })
  })

  it('saves local edits, preserves the later status when the selected scope is unchanged', async () => {
    const user = userEvent.setup()
    const item = createDemoCases()[0]
    item.status = 'redaction'
    item.responseText = 'Robocza odpowiedź'
    item.redactions = [
      { id: 'r', text: 'Jan', reason: 'Dane', decision: 'hide' },
    ]
    item.redactionConfirmed = true
    renderPage(item)
    await user.click(screen.getByRole('button', { name: 'Dodaj pytanie' }))
    await user.click(
      screen.getByRole('checkbox', { name: 'Włącz pytanie 4 do zakresu' }),
    )
    await user.type(
      screen.getByLabelText('Treść pytania 4'),
      'Niewybrane pytanie',
    )
    await user.click(screen.getByRole('button', { name: 'Zapisz ustalenia' }))
    expect(
      await screen.findByText('Ustalenia zostały zapisane.'),
    ).toBeInTheDocument()
    expect(casesApi.setCaseQuestions).not.toHaveBeenCalled()
    expect(savedCase().status).toBe('redaction')
    expect(savedCase().responseText).toBe('Robocza odpowiedź')
    expect(savedCase().redactionConfirmed).toBe(true)
  })

  it('marks a changed scope stale while retaining the response and clears redaction decisions', async () => {
    const user = userEvent.setup()
    const item = createDemoCases()[0]
    item.status = 'draft'
    item.responseText = 'Robocza odpowiedź'
    item.redactions = [
      { id: 'r', text: 'Jan', reason: 'Dane', decision: 'hide' },
    ]
    item.redactionConfirmed = true
    renderPage(item)
    await user.type(screen.getByLabelText('Treść pytania 1'), ' poprawiony')
    expect(
      screen.getByText(/oznaczy projekt odpowiedzi jako wymagający/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zapisz ustalenia' }))
    await waitFor(() => expect(savedCase().status).toBe('waiting'))
    expect(savedCase().responseText).toBe('Robocza odpowiedź')
    expect(savedCase().redactions).toEqual([])
    expect(savedCase().redactionConfirmed).toBe(false)
    expect(
      screen.getByText(/Projekt odpowiedzi wymaga ponownego sprawdzenia/),
    ).toBeInTheDocument()
  })

  it('adds and removes a unit from the dictionary', async () => {
    vi.mocked(departmentApi.getDepartments).mockResolvedValue([
      {
        id: 'archive',
        name: 'Archiwum',
        symbol: 'AR',
        kind: 'DEPARTMENT',
        isActive: true,
      },
    ])
    const user = userEvent.setup()
    renderPage(createDemoCases()[0])
    await waitFor(() =>
      expect(
        document.querySelector('#department-options option'),
      ).toBeInTheDocument(),
    )
    await user.type(screen.getByLabelText('Nazwa jednostki'), 'Archiwum')
    await user.type(
      screen.getByLabelText('Uzasadnienie wyboru (opcjonalnie)'),
      'Zasób archiwalny',
    )
    await user.click(screen.getByRole('button', { name: 'Dodaj jednostkę' }))
    expect(screen.getByText('Zasób archiwalny')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zapisz ustalenia' }))
    await waitFor(() =>
      expect(casesApi.setCaseDepartments).toHaveBeenLastCalledWith(
        expect.objectContaining({
          departmentIds: expect.arrayContaining(['archive']),
        }),
        expect.anything(),
      ),
    )
    await user.click(
      screen.getByRole('button', { name: 'Usuń jednostkę Archiwum' }),
    )
    expect(screen.queryByText('Zasób archiwalny')).not.toBeInTheDocument()
  })

  describe('similar responses', () => {
    const match = (
      overrides: Partial<KnowledgeMatch> = {},
    ): KnowledgeMatch => ({
      chunkId: 'c1',
      documentId: 'doc-1',
      documentName: 'Odpowiedź o uczniach',
      category: 'RESPONSE',
      position: 0,
      content: 'Liczba uczniów cudzoziemców wynosi 12.',
      score: 0.82,
      ...overrides,
    })

    it('searches with the request text and shows the best fragment per document', async () => {
      vi.mocked(knowledgeApi.searchKnowledge).mockResolvedValue({
        matches: [
          match({ chunkId: 'c2', score: 0.4, content: 'Słabszy fragment' }),
          match(),
          match({
            chunkId: 'c3',
            documentId: 'doc-2',
            documentName: 'Inna odpowiedź',
            score: 0.6,
            content: 'Fragment drugiego dokumentu',
          }),
        ],
      })
      const item = createDemoCases()[0]
      renderPage(item)

      expect(
        await screen.findByText('Odpowiedź o uczniach'),
      ).toBeInTheDocument()
      expect(screen.getByText('Podobieństwo: 82%')).toBeInTheDocument()
      expect(
        screen.getByText('Liczba uczniów cudzoziemców wynosi 12.'),
      ).toBeInTheDocument()
      expect(screen.queryByText('Słabszy fragment')).not.toBeInTheDocument()
      expect(screen.getByText('Inna odpowiedź')).toBeInTheDocument()
      expect(vi.mocked(knowledgeApi.searchKnowledge).mock.calls[0][0]).toEqual({
        query: item.requestText.trim(),
        k: 5,
        categories: ['RESPONSE'],
      })
    })

    it('says so when nothing similar was found', async () => {
      renderPage(createDemoCases()[0])
      expect(
        await screen.findByText(
          'Nie znaleziono podobnych odpowiedzi w bazie wiedzy.',
        ),
      ).toBeInTheDocument()
    })

    it('does not search without a request text', () => {
      renderPage({ ...createDemoCases()[0], requestText: '  ' })
      expect(
        screen.getByText(
          'Uzupełnij treść wniosku, aby wyszukać podobne odpowiedzi.',
        ),
      ).toBeInTheDocument()
      expect(knowledgeApi.searchKnowledge).not.toHaveBeenCalled()
    })

    it('shows an error with a retry', async () => {
      const user = userEvent.setup()
      vi.mocked(knowledgeApi.searchKnowledge).mockRejectedValueOnce(
        new Error('network'),
      )
      renderPage(createDemoCases()[0])
      expect(
        await screen.findByText('Nie udało się wyszukać podobnych odpowiedzi.'),
      ).toBeInTheDocument()
      vi.mocked(knowledgeApi.searchKnowledge).mockResolvedValue({
        matches: [match()],
      })
      await user.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }))
      expect(
        await screen.findByText('Odpowiedź o uczniach'),
      ).toBeInTheDocument()
    })

    it('opens the whole document', async () => {
      const user = userEvent.setup()
      vi.mocked(knowledgeApi.searchKnowledge).mockResolvedValue({
        matches: [match()],
      })
      renderPage(createDemoCases()[0])
      await user.click(
        await screen.findByRole('button', { name: 'Zobacz treść' }),
      )
      expect(
        await within(screen.getByRole('dialog')).findByText('Treść wzoru'),
      ).toBeInTheDocument()
    })
  })

  it('keeps completed cases read-only', async () => {
    const user = userEvent.setup()
    const item = createDemoCases()[0]
    item.status = 'completed'
    renderPage(item)
    expect(screen.getByLabelText('Treść pytania 1')).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Zapisz ustalenia' }),
    ).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Przejdź do materiałów' }),
    )
    expect(screen.getByText('Etap materiałów')).toBeInTheDocument()
    expect(savedCase()).toEqual(item)
  })

  it('wymaga jawnego zapisu poprawnej analizy po zmianie wniosku', async () => {
    const item = createDemoCases()[0]
    item.analysisNeedsReview = true
    const user = userEvent.setup()
    renderPage(item)
    expect(
      screen.getByText(/Treść lub temat wniosku zmieniły się/),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zapisz ustalenia' }))
    expect(savedCase().analysisNeedsReview).toBe(false)
  })

  describe('sprawa z API', () => {
    const remoteItem = () =>
      composeApiCase(
        {
          ...detail,
          questions: [
            { id: 'q1', position: 1, text: 'Pytanie?', departmentId: null },
          ],
        },
        {
          analysisNeedsReview: true,
          departmentReasons: { 'dept-1': 'Rejestr' },
        },
      )

    it('pokazuje uzasadnienie AI i zapisuje zmienione pytania na serwerze', async () => {
      vi.mocked(casesApi.setCaseQuestions).mockResolvedValue(detail)
      const user = userEvent.setup()
      const item = remoteItem()
      renderRemote(item)
      expect(screen.getByText('Rejestr')).toBeInTheDocument()
      const field = screen.getByLabelText('Treść pytania 1')
      await user.clear(field)
      await user.type(field, 'Nowe pytanie?')
      await user.click(screen.getByRole('button', { name: 'Zapisz ustalenia' }))
      await waitFor(() => expect(casesApi.setCaseQuestions).toHaveBeenCalled())
      expect(vi.mocked(casesApi.setCaseQuestions).mock.calls[0][0]).toEqual({
        id: item.id,
        questions: [{ text: 'Nowe pytanie?', departmentId: null }],
      })
      expect(casesApi.setCaseDepartments).not.toHaveBeenCalled()
    })

    it('nie zapisuje ustaleń lokalnie, gdy serwer odrzuci zmianę', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.mocked(casesApi.setCaseQuestions).mockRejectedValue(new Error('500'))
      const user = userEvent.setup()
      renderRemote(remoteItem())
      await user.type(screen.getByLabelText('Treść pytania 1'), ' x')
      await user.click(screen.getByRole('button', { name: 'Zapisz ustalenia' }))
      expect(
        await screen.findByText(/Nie udało się zapisać pytań i jednostek/),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Treść lub temat wniosku zmieniły się/),
      ).toBeInTheDocument()
    })

    it('odrzuca jednostkę spoza słownika serwera', async () => {
      const user = userEvent.setup()
      renderRemote(remoteItem())
      await user.type(screen.getByLabelText('Nazwa jednostki'), 'Nieznana')
      await user.click(screen.getByRole('button', { name: 'Dodaj jednostkę' }))
      expect(screen.getByText(/Wybierz jednostkę z listy/)).toBeInTheDocument()
    })
  })
})
