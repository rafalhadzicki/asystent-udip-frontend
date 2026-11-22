import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as casesApi from '@/api/cases/cases.api'
import type { CaseSummary } from '@/api/cases/cases.schemas'
import { createTestQueryClient } from '@/test/query-client'
import { CalendarPage } from './calendar-page'

vi.mock('@/api/cases/cases.api', () => ({ getCases: vi.fn() }))

const summary = (overrides: Partial<CaseSummary>): CaseSummary => ({
  id: 'case-1',
  year: 2026,
  sequenceNumber: 1,
  caseNumber: 'BKS.IV.1431.1.2026',
  subject: 'Umowy na obsługę prawną',
  status: 'NEW',
  receivedAt: '2026-11-02',
  dueAt: '2026-11-21',
  extendedDueAt: null,
  isExtended: false,
  effectiveDueAt: '2026-11-21',
  daysLeft: 0,
  urgency: 'DUE_TODAY',
  respondedAt: null,
  handlerInitials: null,
  assignee: null,
  departments: [],
  ...overrides,
})

const thisYear = [
  summary({}),
  summary({
    id: 'case-2',
    caseNumber: 'BKS.IV.1431.2.2026',
    subject: 'Koszty zieleni',
    effectiveDueAt: '2026-11-10',
    urgency: 'OVERDUE',
    daysLeft: -11,
  }),
  summary({
    id: 'case-3',
    caseNumber: 'BKS.IV.1431.3.2026',
    subject: 'Zakończona sprawa',
    status: 'RESPONSE_SENT',
    effectiveDueAt: '2026-11-21',
    urgency: 'DONE',
  }),
  summary({
    id: 'case-4',
    caseNumber: 'BKS.IV.1431.4.2026',
    subject: 'Dalszy termin',
    effectiveDueAt: '2026-11-30',
    urgency: 'UPCOMING',
    daysLeft: 9,
  }),
]
const lastYear = [
  summary({
    id: 'case-5',
    year: 2025,
    caseNumber: 'BKS.IV.1431.90.2025',
    subject: 'Sprawa ze zeszłego roku',
    receivedAt: '2025-12-20',
    effectiveDueAt: '2026-11-21',
  }),
]

const renderCalendar = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-21T10:00:00'))
  vi.mocked(casesApi.getCases).mockImplementation(async ({ year }) => {
    const items = year === 2026 ? thisYear : year === 2025 ? lastYear : []
    return { items, total: items.length }
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('CalendarPage', () => {
  it('lists the cases of the current and previous year on their deadline day', async () => {
    renderCalendar()

    expect(
      screen.getByRole('heading', { name: 'listopad 2026' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Sprawa ze zeszłego roku'),
    ).toBeInTheDocument()
    expect(casesApi.getCases).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2026, sort: 'DEADLINE_ASC', limit: 500 }),
      expect.anything(),
    )
    expect(casesApi.getCases).toHaveBeenCalledWith(
      expect.objectContaining({ year: 2025 }),
      expect.anything(),
    )
    expect(screen.getByText('Po terminie: 1')).toBeInTheDocument()
    expect(screen.getByText('Termin dzisiaj: 2')).toBeInTheDocument()
    expect(screen.getByText('W terminie: 1')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Dzisiaj: 21.11.2026' }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('link', { name: 'Otwórz sprawę' })[0],
    ).toHaveAttribute('href', '/sprawy/case-1/wniosek')
  })

  it('uses a Monday-aligned grid and moves between months', async () => {
    const user = userEvent.setup()
    renderCalendar()
    await screen.findByText('Sprawa ze zeszłego roku')

    const monday = screen.getByRole('button', {
      name: '26 października 2026, sprawy: 0',
    })
    const sunday = screen.getByRole('button', {
      name: '1 listopada 2026, sprawy: 0',
    })
    expect(monday.parentElement?.children[7]).toBe(monday)
    expect(monday.parentElement?.children[13]).toBe(sunday)

    await user.click(screen.getByRole('button', { name: 'Następny miesiąc' }))
    expect(
      screen.getByRole('heading', { name: 'grudzień 2026' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Brak spraw z terminem w tym dniu.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Poprzedni miesiąc' }))
    await user.click(
      screen.getByRole('button', { name: 'Dzisiaj: 21.11.2026' }),
    )
    expect(screen.getByText('Umowy na obsługę prawną')).toBeInTheDocument()
  })

  it('shows overflow and optionally completed cases without adding them to urgency counts', async () => {
    const user = userEvent.setup()
    renderCalendar()
    const day = await screen.findByRole('button', {
      name: '21 listopada 2026, sprawy: 2',
    })
    expect(within(day).queryByText('+1')).not.toBeInTheDocument()
    expect(screen.queryByText('Zakończona sprawa')).not.toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: 'Pokaż zakończone' }))
    expect(
      within(
        screen.getByRole('button', { name: '21 listopada 2026, sprawy: 3' }),
      ).getByText('+1'),
    ).toBeInTheDocument()
    expect(screen.getByText('Zakończona sprawa')).toBeInTheDocument()
    expect(screen.getByText('Termin dzisiaj: 2')).toBeInTheDocument()
  })

  it('warns when the server returned only part of a year', async () => {
    vi.mocked(casesApi.getCases).mockImplementation(async ({ year }) => ({
      items: year === 2026 ? thisYear : [],
      total: year === 2026 ? 900 : 0,
    }))
    renderCalendar()
    expect(
      await screen.findByText(/Wyświetlono tylko część spraw/),
    ).toBeInTheDocument()
  })

  it('shows an error with a retry when the cases cannot be loaded', async () => {
    const user = userEvent.setup()
    vi.mocked(casesApi.getCases).mockRejectedValue(new Error('network'))
    renderCalendar()
    expect(
      await screen.findByText('Nie udało się pobrać spraw do kalendarza.'),
    ).toBeInTheDocument()
    vi.mocked(casesApi.getCases).mockResolvedValue({
      items: thisYear,
      total: thisYear.length,
    })
    await user.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }))
    await waitFor(() =>
      expect(
        screen.queryByText('Nie udało się pobrać spraw do kalendarza.'),
      ).not.toBeInTheDocument(),
    )
  })
})
