import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DemoProvider, DEMO_STORAGE_KEY, useDemoStore } from './demo-store'
import { createDemoCases, createDemoKnowledge } from './demo-data'

const DemoProbe = () => {
  const store = useDemoStore()
  return (
    <div>
      <span>{store.cases[0].subject}</span>
      <span data-testid="storage-error">{store.storageError}</span>
      <button
        onClick={() =>
          store.updateCase('demo-1', { subject: 'Changed demo subject' })
        }
      >
        Change
      </button>
      <button onClick={store.resetDemo}>Reset</button>
    </div>
  )
}

beforeEach(() => localStorage.clear())

describe('demo persistence', () => {
  it('restores cases with an optional empty written date', () => {
    const cases = createDemoCases()
    cases[0].writtenAt = ''
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({ version: 1, cases, knowledge: createDemoKnowledge() }),
    )
    render(
      <DemoProvider>
        <DemoProbe />
      </DemoProvider>,
    )
    expect(screen.getByTestId('storage-error')).toBeEmptyDOMElement()
    expect(screen.getByText(cases[0].subject)).toBeInTheDocument()
  })

  it.each(['deadline', 'source', 'contactedAt', 'sentAt', 'knowledge'])(
    'rejects malformed persisted %s dates with a visible error',
    (field) => {
      const cases = createDemoCases()
      const knowledge = createDemoKnowledge()
      if (field === 'source') cases[0].source.addedAt = 'invalid'
      else if (field === 'knowledge') knowledge[0].updatedAt = 'invalid'
      else if (field === 'deadline') cases[0].deadline = '2026-02-30'
      else if (field === 'contactedAt') cases[0].contactedAt = 'invalid'
      else cases[0].sentAt = 'invalid'
      localStorage.setItem(
        DEMO_STORAGE_KEY,
        JSON.stringify({ version: 1, cases, knowledge }),
      )
      const log = vi.spyOn(console, 'error').mockImplementation(() => {})
      render(
        <DemoProvider>
          <DemoProbe />
        </DemoProvider>,
      )
      expect(screen.getByTestId('storage-error')).toHaveTextContent('restore')
      expect(log).toHaveBeenCalled()
      log.mockRestore()
    },
  )

  it('persists case changes and restores them after remount', () => {
    const view = render(
      <DemoProvider>
        <DemoProbe />
      </DemoProvider>,
    )
    act(() => screen.getByText('Change').click())
    expect(
      JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)!).cases[0].subject,
    ).toBe('Changed demo subject')
    view.unmount()
    render(
      <DemoProvider>
        <DemoProbe />
      </DemoProvider>,
    )
    expect(screen.getByText('Changed demo subject')).toBeInTheDocument()
    act(() => screen.getByText('Reset').click())
    expect(screen.queryByText('Changed demo subject')).not.toBeInTheDocument()
    expect(
      JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)!).cases,
    ).toHaveLength(10)
  })

  it('reports corrupt storage explicitly rather than crashing', () => {
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      '{"version":1,"cases":[{}],"knowledge":[]}',
    )
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <DemoProvider>
        <DemoProbe />
      </DemoProvider>,
    )
    expect(screen.getByTestId('storage-error')).toHaveTextContent('restore')
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })

  it('reports write failures while preserving in-memory changes', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const write = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      })
    render(
      <DemoProvider>
        <DemoProbe />
      </DemoProvider>,
    )
    act(() => screen.getByText('Change').click())
    expect(screen.getByTestId('storage-error')).toHaveTextContent('save')
    expect(screen.getByText('Changed demo subject')).toBeInTheDocument()
    write.mockRestore()
    log.mockRestore()
  })
})
