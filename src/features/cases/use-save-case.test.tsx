import { renderHook, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as casesApi from '@/api/cases/cases.api'
import { LocalStoreProvider, useLocalStore } from '@/features/cases/local-store'
import { detail } from '@/test/case-detail'
import { createTestQueryClient } from '@/test/query-client'
import { composeApiCase } from './case-from-api'
import { useSaveCase } from './use-save-case'

vi.mock('@/api/cases/cases.api', () => ({ updateCase: vi.fn() }))

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <LocalStoreProvider>{children}</LocalStoreProvider>
  </QueryClientProvider>
)

afterEach(() => localStorage.clear())

describe('useSaveCase', () => {
  it('sends server fields through PATCH and keeps the rest as a local overlay', async () => {
    vi.mocked(casesApi.updateCase).mockResolvedValue(detail)
    const item = composeApiCase(detail)
    const { result } = renderHook(
      () => ({ save: useSaveCase(item), store: useLocalStore() }),
      { wrapper },
    )
    await act(() =>
      result.current.save({
        subject: 'Nowy temat',
        deadline: '2030-01-01',
        responseText: 'Projekt',
      }),
    )
    expect(casesApi.updateCase).toHaveBeenCalledOnce()
    expect(vi.mocked(casesApi.updateCase).mock.calls[0][0]).toEqual({
      id: 'case-1',
      caseNumber: undefined,
      subject: 'Nowy temat',
      requesterName: undefined,
      receivedAt: undefined,
      requestText: undefined,
    })
    expect(result.current.store.overlays['case-1']).toEqual({
      responseText: 'Projekt',
    })
  })

  it('does not call the API for local-only changes', async () => {
    const { result } = renderHook(
      () => ({
        save: useSaveCase(composeApiCase(detail)),
        store: useLocalStore(),
      }),
      { wrapper },
    )
    await act(() => result.current.save({ responseText: 'Projekt' }))
    expect(casesApi.updateCase).not.toHaveBeenCalled()
    expect(result.current.store.overlays['case-1']).toEqual({
      responseText: 'Projekt',
    })
  })

  it('does not store the local change when the PATCH fails', async () => {
    vi.mocked(casesApi.updateCase).mockRejectedValue(new Error('network'))
    const { result } = renderHook(
      () => ({
        save: useSaveCase(composeApiCase(detail)),
        store: useLocalStore(),
      }),
      { wrapper },
    )
    await expect(
      act(() => result.current.save({ subject: 'X', responseText: 'Y' })),
    ).rejects.toThrow('network')
    expect(result.current.store.overlays['case-1']).toBeUndefined()
  })
})
