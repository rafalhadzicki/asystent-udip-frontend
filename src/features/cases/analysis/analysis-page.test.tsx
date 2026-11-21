import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createDemoCases, createDemoKnowledge } from '@/features/demo/demo-data'
import {
  DEMO_STORAGE_KEY,
  DemoProvider,
  useDemoStore,
} from '@/features/demo/demo-store'
import type { CaseItem, KnowledgeItem } from '@/features/demo/types'
import { AnalysisPage } from './analysis-page'
import * as departmentApi from '@/api/departments/departments.api'
import { createTestQueryClient } from '@/test/query-client'

vi.mock('@/api/departments/departments.api', () => ({
  getDepartments: vi.fn().mockResolvedValue([]),
}))

const CaseOutlet = () => {
  const { cases } = useDemoStore()
  return <Outlet context={cases[0]} />
}

const renderPage = (item: CaseItem, knowledge = createDemoKnowledge()) => {
  localStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify({ version: 1, cases: [item], knowledge }),
  )
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <DemoProvider>
        <MemoryRouter initialEntries={[`/sprawy/${item.id}/analiza`]}>
          <Routes>
            <Route path="/sprawy/:caseId" element={<CaseOutlet />}>
              <Route path="analiza" element={<AnalysisPage />} />
              <Route path="materialy" element={<div>Etap materiałów</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </DemoProvider>
    </QueryClientProvider>,
  )
}

const savedCase = () =>
  (
    JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || '{}') as {
      cases: CaseItem[]
    }
  ).cases[0]

describe('analiza sprawy', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(departmentApi.getDepartments).mockReset().mockResolvedValue([])
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
    ])
    const user = userEvent.setup()
    renderPage(createDemoCases()[0])
    await waitFor(() => expect(departmentApi.getDepartments).toHaveBeenCalled())
    await waitFor(() =>
      expect(
        document.querySelector('#department-options option'),
      ).toHaveAttribute('value', 'Wydział testowy'),
    )
    await user.type(screen.getByLabelText('Nazwa jednostki'), 'Wydział testowy')
    await user.click(screen.getByRole('button', { name: 'Dodaj jednostkę' }))
    await user.click(screen.getByRole('button', { name: 'Zapisz ustalenia' }))
    expect(savedCase().departments).toContainEqual(
      expect.objectContaining({
        id: 'api-unit',
        name: 'Wydział testowy',
        selected: true,
      }),
    )
    expect(
      screen.getByText(/wybór zapisuje się na razie tylko lokalnie/),
    ).toBeInTheDocument()
  })

  it('informuje o błędzie pobierania jednostek', async () => {
    vi.mocked(departmentApi.getDepartments).mockRejectedValue(
      new Error('network'),
    )
    renderPage(createDemoCases()[0])
    expect(
      await screen.findByText(/Nie udało się pobrać jednostek z API/),
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
    expect(savedCase().questions[0].text).toBe('Dokumenty')
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
    await waitFor(() => expect(savedCase().questions).toHaveLength(4))
    expect(savedCase().status).toBe('redaction')
    expect(savedCase().responseText).toBe('Robocza odpowiedź')
    expect(savedCase().redactionConfirmed).toBe(true)
    expect(screen.getByText('Ustalenia zostały zapisane.')).toBeInTheDocument()
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

  it('adds and removes a custom unit and displays stored response descriptions only', async () => {
    const user = userEvent.setup()
    const knowledge: KnowledgeItem[] = [
      {
        id: 'x',
        name: 'Przykład',
        category: 'response',
        description: 'Zapisany opis',
        updatedAt: '2026-01-01',
        fileName: 'opis.txt',
      },
      {
        id: 'y',
        name: 'Przepis',
        category: 'law',
        description: 'Inny materiał',
        updatedAt: '2026-01-01',
        fileName: 'prawo.txt',
      },
    ]
    renderPage(createDemoCases()[0], knowledge)
    await user.type(screen.getByLabelText('Nazwa jednostki'), 'Archiwum')
    await user.type(
      screen.getByLabelText('Uzasadnienie wyboru (opcjonalnie)'),
      'Zasób archiwalny',
    )
    await user.click(screen.getByRole('button', { name: 'Dodaj jednostkę' }))
    expect(screen.getByText('Zasób archiwalny')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zapisz ustalenia' }))
    await waitFor(() =>
      expect(
        savedCase().departments.some(
          (department) => department.name === 'Archiwum' && department.selected,
        ),
      ).toBe(true),
    )
    await user.click(
      screen.getByRole('button', { name: 'Usuń jednostkę Archiwum' }),
    )
    await user.click(screen.getByRole('button', { name: 'Zapisz ustalenia' }))
    await waitFor(() =>
      expect(
        savedCase().departments.some(
          (department) => department.name === 'Archiwum',
        ),
      ).toBe(false),
    )
    expect(screen.queryByText('Przepis')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Zobacz opis' }))
    expect(
      within(screen.getByRole('dialog')).getByText('Zapisany opis'),
    ).toBeInTheDocument()
    expect(
      within(screen.getByRole('dialog')).getByText('Plik: opis.txt'),
    ).toBeInTheDocument()
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

  it('unieważnia potwierdzenie kontaktu po zmianie wybranych jednostek', async () => {
    const item = createDemoCases()[0]
    item.contactedAt = '2026-11-20'
    const user = userEvent.setup()
    renderPage(item)
    await user.click(
      screen.getByRole('checkbox', { name: 'Wybierz jednostkę ZDMiKP' }),
    )
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Wybierz jednostkę Wydział Inwestycji Miasta',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Zapisz ustalenia' }))
    expect(savedCase().contactedAt).toBe('')
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
})
