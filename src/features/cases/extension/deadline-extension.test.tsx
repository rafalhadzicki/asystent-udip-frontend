import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as casesApi from '@/api/cases/cases.api'
import type { CaseDetail } from '@/api/cases/cases.schemas'
import { createTestQueryClient } from '@/test/query-client'
import { detail } from '@/test/case-detail'
import { composeApiCase } from '@/features/cases/case-from-api'
import { DeadlineExtension } from './deadline-extension'

vi.mock('@/api/cases/cases.api', () => ({
  extendDeadline: vi.fn(),
  cancelExtension: vi.fn(),
}))

const base: CaseDetail = {
  ...detail,
  receivedAt: '2026-10-22',
  dueAt: '2026-11-05',
  extendedDueAt: null,
  maxExtendedDueAt: '2026-12-22',
}

const renderExtension = (overrides: Partial<CaseDetail> = {}) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <DeadlineExtension item={composeApiCase({ ...base, ...overrides })} />
    </QueryClientProvider>,
  )

const failure = (status: number) =>
  new AxiosError('fail', 'ERR', undefined, undefined, {
    status,
    statusText: '',
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

afterEach(() => vi.clearAllMocks())

describe('DeadlineExtension', () => {
  it('sends the new deadline with the reason', async () => {
    const user = userEvent.setup()
    vi.mocked(casesApi.extendDeadline).mockResolvedValue(base)
    renderExtension()
    await user.click(
      screen.getByRole('button', { name: 'Przedłuż termin (kwerenda)' }),
    )
    fireEvent.change(screen.getByLabelText(/Nowy termin/), {
      target: { value: '2026-11-30' },
    })
    await user.type(screen.getByLabelText(/Powód zwłoki/), 'Zbieranie danych')
    await user.click(
      screen.getByRole('button', { name: 'Zapisz przedłużenie' }),
    )
    await vi.waitFor(() =>
      expect(casesApi.extendDeadline).toHaveBeenCalledWith(
        {
          id: base.id,
          extendedDueAt: '2026-11-30',
          reason: 'Zbieranie danych',
        },
        expect.anything(),
      ),
    )
  })

  it('rejects a date outside the allowed range and an empty reason locally', async () => {
    const user = userEvent.setup()
    renderExtension()
    await user.click(
      screen.getByRole('button', { name: 'Przedłuż termin (kwerenda)' }),
    )
    fireEvent.change(screen.getByLabelText(/Nowy termin/), {
      target: { value: '2027-01-01' },
    })
    await user.click(
      screen.getByRole('button', { name: 'Zapisz przedłużenie' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'od 06.11.2026 do 22.12.2026',
    )
    fireEvent.change(screen.getByLabelText(/Nowy termin/), {
      target: { value: '2026-11-30' },
    })
    await user.click(
      screen.getByRole('button', { name: 'Zapisz przedłużenie' }),
    )
    expect(await screen.findByText('Podaj powód zwłoki.')).toBeInTheDocument()
    expect(casesApi.extendDeadline).not.toHaveBeenCalled()
  })

  it('shows the server refusal in the dialog', async () => {
    const user = userEvent.setup()
    vi.mocked(casesApi.extendDeadline).mockRejectedValue(failure(409))
    renderExtension()
    await user.click(
      screen.getByRole('button', { name: 'Przedłuż termin (kwerenda)' }),
    )
    fireEvent.change(screen.getByLabelText(/Nowy termin/), {
      target: { value: '2026-11-30' },
    })
    await user.type(screen.getByLabelText(/Powód zwłoki/), 'Powód')
    await user.click(
      screen.getByRole('button', { name: 'Zapisz przedłużenie' }),
    )
    expect(
      await screen.findByText(/odpowiedź została już wysłana/),
    ).toBeInTheDocument()
  })

  it('shows an extended deadline and withdraws it', async () => {
    const user = userEvent.setup()
    vi.mocked(casesApi.cancelExtension).mockResolvedValue(base)
    renderExtension({
      extendedDueAt: '2026-11-30',
      extensionReason: 'Zbieranie danych',
    })
    expect(
      screen.getByText(
        'Termin przedłużony z 05.11.2026 do 30.11.2026. Powód: Zbieranie danych',
      ),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Cofnij przedłużenie' }),
    )
    await vi.waitFor(() =>
      expect(casesApi.cancelExtension).toHaveBeenCalledWith(
        base.id,
        expect.anything(),
      ),
    )
  })

  it('offers no changes once the response was sent', () => {
    renderExtension({
      status: 'RESPONSE_SENT',
      extendedDueAt: '2026-11-30',
      extensionReason: 'Powód',
    })
    expect(screen.getByText(/Termin przedłużony/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
