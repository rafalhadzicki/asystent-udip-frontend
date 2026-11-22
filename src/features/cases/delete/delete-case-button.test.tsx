import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as casesApi from '@/api/cases/cases.api'
import { createTestQueryClient } from '@/test/query-client'
import { detail } from '@/test/case-detail'
import { composeApiCase } from '@/features/cases/case-from-api'
import { LocalStoreProvider } from '@/features/cases/local-store'
import { DeleteCaseButton } from './delete-case-button'

vi.mock('@/api/cases/cases.api', () => ({ deleteCase: vi.fn() }))

const renderButton = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <LocalStoreProvider>
        <MemoryRouter initialEntries={['/case']}>
          <Routes>
            <Route
              path="/case"
              element={<DeleteCaseButton item={composeApiCase(detail)} />}
            />
            <Route path="/*" element={<p>Rejestr</p>} />
          </Routes>
        </MemoryRouter>
      </LocalStoreProvider>
    </QueryClientProvider>,
  )

const openDialog = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Usuń sprawę' }))

afterEach(() => vi.clearAllMocks())

describe('DeleteCaseButton', () => {
  it('does nothing until the deletion is confirmed', async () => {
    const user = userEvent.setup()
    renderButton()
    await openDialog(user)
    await user.click(screen.getByRole('button', { name: 'Anuluj' }))
    expect(casesApi.deleteCase).not.toHaveBeenCalled()
  })

  it('deletes the case and returns to the register', async () => {
    const user = userEvent.setup()
    vi.mocked(casesApi.deleteCase).mockResolvedValue(undefined)
    renderButton()
    await openDialog(user)
    await user.click(screen.getByRole('button', { name: 'Usuń sprawę' }))
    expect(await screen.findByText('Rejestr')).toBeInTheDocument()
    expect(casesApi.deleteCase).toHaveBeenCalledWith(
      detail.id,
      expect.anything(),
    )
  })

  it('keeps the dialog open with a message when deletion fails', async () => {
    const user = userEvent.setup()
    vi.mocked(casesApi.deleteCase).mockRejectedValue(new Error('fail'))
    renderButton()
    await openDialog(user)
    await user.click(screen.getByRole('button', { name: 'Usuń sprawę' }))
    expect(
      await screen.findByText('Nie udało się usunąć sprawy. Spróbuj ponownie.'),
    ).toBeInTheDocument()
  })
})
