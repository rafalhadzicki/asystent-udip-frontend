import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as casesApi from '@/api/cases/cases.api'
import { DEMO_STORAGE_KEY, DemoProvider } from '@/features/demo/demo-store'
import { detail } from '@/test/case-detail'
import { createTestQueryClient } from '@/test/query-client'
import { CaseLayout } from './case-layout'

vi.mock('@/api/cases/cases.api', () => ({ getCase: vi.fn() }))

const renderCase = (id: string) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <DemoProvider>
        <MemoryRouter initialEntries={[`/sprawy/${id}/wniosek`]}>
          <Routes>
            <Route path="/sprawy/:caseId" element={<CaseLayout />}>
              <Route path="wniosek" element={<div>Zakładka wniosku</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </DemoProvider>
    </QueryClientProvider>,
  )

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('CaseLayout', () => {
  it('shows a case from the API with its backend stage and stores nothing locally', async () => {
    vi.mocked(casesApi.getCase).mockResolvedValue(detail)
    renderCase('case-1')
    expect(await screen.findByText('Zakładka wniosku')).toBeInTheDocument()
    expect(screen.getByText('BKS.IV.1431.1.2026')).toBeInTheDocument()
    expect(screen.getByText('Oczekuje na materiały')).toBeInTheDocument()
    expect(casesApi.getCase).toHaveBeenCalledWith('case-1', expect.anything())
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBeNull()
  })

  it('does not call the API for local demo cases', async () => {
    renderCase('demo-1')
    expect(await screen.findByText('Zakładka wniosku')).toBeInTheDocument()
    expect(casesApi.getCase).not.toHaveBeenCalled()
  })

  it('reports a case that exists neither locally nor in the API', async () => {
    vi.mocked(casesApi.getCase).mockRejectedValue(new Error('not found'))
    renderCase('missing')
    expect(await screen.findByText(/Nie znaleziono sprawy/)).toBeInTheDocument()
  })

  it('keeps tabs usable after navigating between them', async () => {
    vi.mocked(casesApi.getCase).mockResolvedValue(detail)
    renderCase('case-1')
    await userEvent
      .setup()
      .click(await screen.findByRole('tab', { name: 'Wniosek' }))
    expect(screen.getByText('Zakładka wniosku')).toBeInTheDocument()
  })
})
