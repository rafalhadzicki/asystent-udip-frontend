import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDemoCases } from '../demo/demo-data'
import type { CaseItem } from '../demo/types'
import { RegisterPage } from './register-page'

const state = vi.hoisted(() => ({ cases: [] as CaseItem[] }))
vi.mock('../demo/demo-store', () => ({
  useDemoStore: () => ({ cases: state.cases }),
}))

const Location = () => {
  const { search } = useLocation()
  return <div data-testid="location">{search}</div>
}

const renderPage = (url = '/sprawy') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <RegisterPage />
      <Location />
    </MemoryRouter>,
  )

beforeEach(() => {
  state.cases = createDemoCases()
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('RegisterPage', () => {
  it('sorts by oldest receipt and counts only active deadlines', () => {
    state.cases[9] = { ...state.cases[9], deadline: '2026-11-19' }
    renderPage()
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('UDIP/2026/0158')
    expect(rows[10]).toHaveTextContent('UDIP/2026/0167')
    expect(screen.getByText('Po terminie: 2')).toBeInTheDocument()
    expect(screen.getByText('Dziś: 1')).toBeInTheDocument()
    expect(screen.getByText('Jutro: 1')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'UDIP/2026/0158' }),
    ).toHaveAttribute('href', '/sprawy/demo-1/wniosek')
  })

  it('reads and updates URL filters, sort and pagination and resets them', async () => {
    const user = userEvent.setup()
    state.cases.push({
      ...state.cases[0],
      id: 'extra',
      reference: 'UDIP/2025/0001',
      subject: 'Unikalny temat',
      receivedAt: '2025-01-01',
    })
    renderPage('/sprawy?sort=newest&page=2&other=keep')
    expect(screen.getByText('Pokazano 11–11 z 11 spraw')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'UDIP/2025/0001' }),
    ).toBeInTheDocument()
    await user.type(screen.getByLabelText('Szukaj spraw'), 'Unikalny')
    expect(screen.getByTestId('location')).toHaveTextContent('search=Unikalny')
    expect(screen.getByTestId('location')).not.toHaveTextContent('page=2')
    expect(screen.getByText('Wyniki: 1')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Wyczyść filtry' }))
    expect(screen.getByTestId('location')).toHaveTextContent('?other=keep')
    expect(screen.getByText('Wyniki: 11')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'UDIP/2025/0001' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Go to page 2' }))
    expect(screen.getByTestId('location')).toHaveTextContent('page=2')
  })

  it('applies year and status from the URL', () => {
    state.cases.push({
      ...state.cases[0],
      id: 'extra',
      reference: '2025',
      receivedAt: '2025-01-01',
      status: 'completed',
    })
    renderPage('/sprawy?year=2025&status=completed')
    expect(screen.getByText('Wyniki: 1')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '2025' })).toBeInTheDocument()
  })

  it('updates year and status when changed in the controls', async () => {
    const user = userEvent.setup()
    state.cases.push({
      ...state.cases[0],
      id: 'extra',
      reference: '2025',
      receivedAt: '2025-01-01',
      status: 'completed',
    })
    renderPage()
    await user.click(screen.getByRole('combobox', { name: 'Rok wpływu' }))
    await user.click(screen.getByRole('option', { name: '2025' }))
    expect(screen.getByTestId('location')).toHaveTextContent('year=2025')
    await user.click(screen.getByRole('combobox', { name: 'Etap sprawy' }))
    await user.click(screen.getByRole('option', { name: 'Zakończona' }))
    expect(screen.getByTestId('location')).toHaveTextContent('status=completed')
    expect(screen.getByText('Wyniki: 1')).toBeInTheDocument()
  })

  it('downloads all filtered rows with spreadsheet formulas neutralized', () => {
    state.cases[0] = {
      ...state.cases[0],
      subject: '  =2+2',
      applicant: '@osoba',
    }
    for (let index = 0; index < 10; index += 1) {
      state.cases.push({
        ...state.cases[0],
        id: `extra-${index}`,
        reference: `EXTRA-${index}`,
        receivedAt: '2026-11-30',
      })
    }
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
    renderPage('/sprawy?status=analysis')
    fireEvent.click(screen.getByRole('button', { name: 'Eksportuj CSV' }))
    expect(click).toHaveBeenCalledOnce()
    expect(createObjectURL).toHaveBeenCalledOnce()
    const csv = blob.mock.calls[0][0]?.[0]
    expect(csv).toEqual(expect.stringContaining('"\'  =2+2"'))
    expect(csv).toEqual(expect.stringContaining('"\'@osoba"'))
    expect(csv).toEqual(expect.stringContaining('EXTRA-9'))
    expect(csv).not.toEqual(expect.stringContaining('UDIP/2026/0159'))
  })

  it('reports an export failure instead of claiming success', () => {
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = () => {
          throw new Error('unavailable')
        }
      },
    )
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Eksportuj CSV' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nie udało się przygotować pliku CSV',
    )
  })
})
