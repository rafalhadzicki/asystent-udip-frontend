import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoCases, createDemoKnowledge } from '@/features/demo/demo-data'
import { DEMO_STORAGE_KEY, DemoProvider } from '@/features/demo/demo-store'
import { CalendarPage } from './calendar-page'

const renderCalendar = () =>
  render(
    <MemoryRouter initialEntries={['/kalendarz']}>
      <DemoProvider>
        <CalendarPage />
      </DemoProvider>
    </MemoryRouter>,
  )

describe('CalendarPage', () => {
  beforeEach(() => localStorage.clear())

  it('uses the seed deadlines and a Monday-aligned month grid', async () => {
    const user = userEvent.setup()
    renderCalendar()

    expect(
      screen.getByRole('heading', { name: 'listopad 2026' }),
    ).toBeInTheDocument()
    const firstDay = screen.getByRole('button', {
      name: '26 października 2026, sprawy: 0',
    })
    const sunday = screen.getByRole('button', {
      name: '1 listopada 2026, sprawy: 0',
    })
    expect(firstDay.parentElement?.children[7]).toBe(firstDay)
    expect(firstDay.parentElement?.children[13]).toBe(sunday)
    expect(screen.getByText('Po terminie: 2')).toBeInTheDocument()
    expect(screen.getByText('Termin dzisiaj: 1')).toBeInTheDocument()
    expect(screen.getByText('Termin jutro: 1')).toBeInTheDocument()
    expect(screen.getByText('W terminie: 5')).toBeInTheDocument()
    expect(
      screen.getByText('Wyniki konsultacji społecznych'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Otwórz sprawę' })).toHaveAttribute(
      'href',
      '/sprawy/demo-3/wniosek',
    )

    await user.click(screen.getByRole('button', { name: 'Następny miesiąc' }))
    expect(
      screen.getByRole('heading', { name: 'grudzień 2026' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Brak spraw z terminem w tym dniu.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Poprzedni miesiąc' }))
    expect(
      screen.getByRole('heading', { name: 'listopad 2026' }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Dzisiaj: 21.11.2026' }),
    )
    expect(
      screen.getByText('Wyniki konsultacji społecznych'),
    ).toBeInTheDocument()
  })

  it('shows overflow and optionally completed cases without adding them to urgency counts', async () => {
    const user = userEvent.setup()
    const cases = createDemoCases()
    cases[0].deadline = '2026-11-21'
    cases[1].deadline = '2026-11-21'
    cases[9].deadline = '2026-11-21'
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        cases,
        knowledge: createDemoKnowledge(),
      }),
    )
    renderCalendar()

    const day = screen.getByRole('button', {
      name: '21 listopada 2026, sprawy: 3',
    })
    expect(within(day).getByText('+1')).toBeInTheDocument()
    expect(screen.getByText('Termin dzisiaj: 3')).toBeInTheDocument()
    expect(
      screen.queryByText('Koszty oświetlenia ulic'),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: 'Pokaż zakończone' }))
    expect(screen.getByText('Termin dzisiaj: 3')).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('button', { name: '21 listopada 2026, sprawy: 4' }),
      ).getByText('+2'),
    ).toBeInTheDocument()
    expect(screen.getByText('Koszty oświetlenia ulic')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Otwórz sprawę' })).toHaveLength(
      4,
    )
  })
})
