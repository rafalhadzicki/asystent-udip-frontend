import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as casesApi from '@/api/cases/cases.api'
import type { CaseSummary } from '@/api/cases/cases.schemas'
import { createTestQueryClient } from '@/test/query-client'
import { RegisterPage } from './register-page'

vi.mock('@/api/cases/cases.api', () => ({
  getCases: vi.fn(),
  getCaseYears: vi.fn(),
  getAllCases: vi.fn(),
}))

const summary = (overrides: Partial<CaseSummary> = {}): CaseSummary => ({
  id: 'case-1',
  year: 2026,
  sequenceNumber: 1,
  caseNumber: 'BKS.IV.1431.1.2026',
  subject: 'Umowy na obsługę prawną',
  status: 'NEW',
  receivedAt: '2026-10-22',
  dueAt: '2026-11-05',
  extendedDueAt: null,
  isExtended: false,
  effectiveDueAt: '2026-11-05',
  daysLeft: 3,
  urgency: 'UPCOMING',
  respondedAt: null,
  handlerInitials: 'MZ',
  assignee: { id: 'user-1', email: 'urzednik@example.test' },
  departments: [],
  ...overrides,
})

const Location = () => {
  const { search } = useLocation()
  return <div data-testid="location">{search}</div>
}

const renderPage = (url = '/sprawy') =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={[url]}>
        <RegisterPage />
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const items = [
  summary(),
  summary({
    id: 'case-2',
    caseNumber: 'BKS.IV.1431.2.2026',
    subject: 'Koszty zieleni',
    status: 'SENT_TO_DEPARTMENTS',
    urgency: 'OVERDUE',
    daysLeft: -8,
    assignee: null,
  }),
  summary({
    id: 'case-3',
    caseNumber: 'BKS.IV.1431.3.2026',
    status: 'RESPONSE_SENT',
    urgency: 'DONE',
    respondedAt: '2026-11-01',
  }),
]

beforeEach(() => {
  vi.mocked(casesApi.getCaseYears).mockResolvedValue([2025, 2026])
  vi.mocked(casesApi.getCases).mockImplementation(async (params) => ({
    items: params.limit === 10 ? items : items.slice(0, 2),
    total: params.limit === 10 ? 25 : 2,
  }))
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('RegisterPage', () => {
  it('shows cases from the API with their stage, deadline and owner', async () => {
    renderPage()
    const link = await screen.findByRole('link', {
      name: 'BKS.IV.1431.1.2026',
    })
    expect(link).toHaveAttribute('href', '/sprawy/case-1/wniosek')
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('W analizie')
    expect(rows[1]).toHaveTextContent('urzednik@example.test')
    expect(rows[2]).toHaveTextContent('Oczekuje na materiały')
    expect(rows[2]).toHaveTextContent('Po terminie')
    expect(rows[2]).toHaveTextContent('MZ')
    expect(screen.getByText('Wyniki: 25')).toBeInTheDocument()
    expect(screen.getByText('Pokazano 1–10 z 25 spraw')).toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: /Wnioskodawca/ }),
    ).not.toBeInTheDocument()
  })

  it('requests the newest year by default and the requested page, sort and status', async () => {
    renderPage('/sprawy?sort=deadline&status=NEW&page=2&search=zieleń')
    await waitFor(() =>
      expect(casesApi.getCases).toHaveBeenCalledWith(
        {
          year: 2026,
          status: ['NEW'],
          q: 'zieleń',
          sort: 'DEADLINE_ASC',
          limit: 10,
          offset: 10,
        },
        expect.anything(),
      ),
    )
  })

  it('counts deadlines of unfinished cases from the API urgency', async () => {
    renderPage()
    expect(await screen.findByText('Po terminie: 2')).toBeInTheDocument()
    expect(screen.getByText('Dziś: 0')).toBeInTheDocument()
    expect(screen.getByText('Jutro: 0')).toBeInTheDocument()
    expect(casesApi.getCases).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ['NEW', 'SENT_TO_DEPARTMENTS', 'RESPONSE_PREPARED'],
        limit: 500,
      }),
      expect.anything(),
    )
  })

  it('updates year, status and page in the URL and resets them', async () => {
    const user = userEvent.setup()
    renderPage('/sprawy?other=keep')
    await screen.findByRole('link', { name: 'BKS.IV.1431.1.2026' })
    await user.click(screen.getByRole('combobox', { name: 'Rok wpływu' }))
    await user.click(screen.getByRole('option', { name: '2025' }))
    expect(screen.getByTestId('location')).toHaveTextContent('year=2025')
    await user.click(screen.getByRole('combobox', { name: 'Etap sprawy' }))
    await user.click(screen.getByRole('option', { name: 'Zakończona' }))
    expect(screen.getByTestId('location')).toHaveTextContent(
      'status=RESPONSE_SENT',
    )
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }))
    expect(screen.getByTestId('location')).toHaveTextContent('page=2')
    await user.click(screen.getByRole('button', { name: 'Wyczyść filtry' }))
    expect(screen.getByTestId('location')).toHaveTextContent('?other=keep')
  })

  it('shows an error with a retry action when loading fails', async () => {
    const user = userEvent.setup()
    vi.mocked(casesApi.getCases).mockRejectedValueOnce(new Error('network'))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nie udało się pobrać spraw',
    )
    await user.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }))
    expect(
      await screen.findByRole('link', { name: 'BKS.IV.1431.1.2026' }),
    ).toBeInTheDocument()
  })

  it('downloads every filtered case with spreadsheet formulas neutralized', async () => {
    const user = userEvent.setup()
    vi.mocked(casesApi.getAllCases).mockResolvedValue([
      summary({ subject: '  =2+2', caseNumber: '@numer' }),
      summary({ id: 'case-9', caseNumber: 'LAST-9', assignee: null }),
    ])
    const blob = vi.spyOn(globalThis, 'Blob')
    const createObjectURL = vi.fn(() => 'blob:register')
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createObjectURL
        static revokeObjectURL = vi.fn()
      },
    )
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    renderPage('/sprawy?status=NEW')
    await screen.findByRole('link', { name: 'BKS.IV.1431.1.2026' })
    await user.click(screen.getByRole('button', { name: 'Eksportuj CSV' }))
    await waitFor(() => expect(click).toHaveBeenCalledOnce())
    expect(casesApi.getAllCases).toHaveBeenCalledWith(
      { year: 2026, status: ['NEW'], q: undefined, sort: 'RECEIVED_ASC' },
      expect.any(AbortSignal),
    )
    const csv = blob.mock.calls[0][0]?.[0]
    expect(csv).toEqual(expect.stringContaining('"\'  =2+2"'))
    expect(csv).toEqual(expect.stringContaining('"\'@numer"'))
    expect(csv).toEqual(expect.stringContaining('LAST-9'))
    expect(csv).not.toEqual(expect.stringContaining('Wnioskodawca'))
  })

  it('reports an export failure instead of claiming success', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(casesApi.getAllCases).mockRejectedValue(new Error('network'))
    renderPage()
    await screen.findByRole('link', { name: 'BKS.IV.1431.1.2026' })
    await user.click(screen.getByRole('button', { name: 'Eksportuj CSV' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nie udało się przygotować pliku CSV',
    )
  })

  it('waits for the years before loading the list', async () => {
    let resolveYears: (years: number[]) => void = () => {}
    vi.mocked(casesApi.getCaseYears).mockReturnValue(
      new Promise((resolve) => {
        resolveYears = resolve
      }),
    )
    renderPage()
    await screen.findByText('Ładowanie spraw…')
    expect(casesApi.getCases).not.toHaveBeenCalled()
    resolveYears([2025])
    await waitFor(() =>
      expect(casesApi.getCases).toHaveBeenCalledWith(
        expect.objectContaining({ year: 2025, limit: 10 }),
        expect.anything(),
      ),
    )
    expect(
      vi
        .mocked(casesApi.getCases)
        .mock.calls.every(([params]) => params.year === 2025),
    ).toBe(true)
  })

  it('exports with the typed search at once instead of the debounced one', async () => {
    const user = userEvent.setup()
    vi.mocked(casesApi.getAllCases).mockResolvedValue([summary()])
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = vi.fn(() => 'blob:register')
        static revokeObjectURL = vi.fn()
      },
    )
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderPage()
    await screen.findByRole('link', { name: 'BKS.IV.1431.1.2026' })
    await user.type(screen.getByLabelText('Szukaj spraw'), 'zieleń')
    await user.click(screen.getByRole('button', { name: 'Eksportuj CSV' }))
    expect(casesApi.getAllCases).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'zieleń' }),
      expect.anything(),
    )
  })

  it('warns that the deadline counts are approximate for a very large year', async () => {
    vi.mocked(casesApi.getCases).mockImplementation(async (params) => ({
      items: items.slice(0, 2),
      total: params.limit === 500 ? 900 : 2,
    }))
    renderPage()
    expect(await screen.findByRole('note')).toHaveTextContent(
      'Liczby przybliżone',
    )
  })

  it('does not warn when every unfinished case was counted', async () => {
    renderPage()
    await screen.findByText('Po terminie: 2')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })

  it('retries the years as well as the list after a failure', async () => {
    const user = userEvent.setup()
    vi.mocked(casesApi.getCaseYears).mockRejectedValueOnce(new Error('network'))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nie udało się pobrać spraw',
    )
    await user.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }))
    await waitFor(() => expect(casesApi.getCaseYears).toHaveBeenCalledTimes(2))
  })
})
