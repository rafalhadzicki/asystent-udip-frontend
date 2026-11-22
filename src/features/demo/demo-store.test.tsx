import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DemoProvider, DEMO_STORAGE_KEY, useDemoStore } from './demo-store'
import { createDemoCases } from './demo-data'
import { clearSession, setSession } from '@/api/session'

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
    </div>
  )
}

beforeEach(() => localStorage.clear())

describe('demo persistence', () => {
  it('keeps local data separate for each signed-in user', async () => {
    const user = userEvent.setup()
    setSession({ email: 'a@example.test', accessToken: 'a' })
    render(
      <DemoProvider>
        <DemoProbe />
      </DemoProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Change' }))
    expect(screen.getByText('Changed demo subject')).toBeInTheDocument()
    expect(
      localStorage.getItem(`${DEMO_STORAGE_KEY}:a@example.test`),
    ).toContain('Changed demo subject')
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBeNull()

    act(() => setSession({ email: 'b@example.test', accessToken: 'b' }))
    expect(screen.queryByText('Changed demo subject')).not.toBeInTheDocument()
    expect(
      localStorage.getItem(`${DEMO_STORAGE_KEY}:b@example.test`),
    ).toBeNull()
  })

  it('restores cases with an optional empty written date', () => {
    const cases = createDemoCases()
    cases[0].writtenAt = ''
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({ version: 1, cases }),
    )
    render(
      <DemoProvider>
        <DemoProbe />
      </DemoProvider>,
    )
    expect(screen.getByTestId('storage-error')).toBeEmptyDOMElement()
    expect(screen.getByText(cases[0].subject)).toBeInTheDocument()
  })

  it.each(['deadline', 'source', 'sentAt'])(
    'rejects malformed persisted %s dates with a visible error',
    (field) => {
      const cases = createDemoCases()
      if (field === 'source') cases[0].source.addedAt = 'invalid'
      else if (field === 'deadline') cases[0].deadline = '2026-02-30'
      else cases[0].sentAt = 'invalid'
      localStorage.setItem(
        DEMO_STORAGE_KEY,
        JSON.stringify({ version: 1, cases }),
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
  })

  it('reports corrupt storage explicitly rather than crashing', () => {
    localStorage.setItem(DEMO_STORAGE_KEY, '{"version":1,"cases":[{}]}')
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

  it('does not overwrite changes from another tab and keeps local edits in memory', () => {
    render(
      <DemoProvider>
        <DemoProbe />
      </DemoProvider>,
    )
    const other = JSON.stringify({
      version: 1,
      cases: createDemoCases().map((item, index) =>
        index === 0 ? { ...item, subject: 'Other tab' } : item,
      ),
    })

    localStorage.setItem(DEMO_STORAGE_KEY, other)
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: DEMO_STORAGE_KEY,
          newValue: other,
          storageArea: localStorage,
        }),
      )
    })
    expect(screen.getByTestId('storage-error')).toHaveTextContent('conflict')
    act(() => screen.getByText('Change').click())
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBe(other)
    expect(screen.getByText('Changed demo subject')).toBeInTheDocument()
    expect(screen.getByTestId('storage-error')).toHaveTextContent('conflict')
  })

  it('detects an external change before saving even without a storage event', () => {
    render(
      <DemoProvider>
        <DemoProbe />
      </DemoProvider>,
    )
    const other = JSON.stringify({
      version: 1,
      cases: createDemoCases().map((item, index) =>
        index === 0 ? { ...item, subject: 'Other tab' } : item,
      ),
    })
    localStorage.setItem(DEMO_STORAGE_KEY, other)
    act(() => screen.getByText('Change').click())
    expect(localStorage.getItem(DEMO_STORAGE_KEY)).toBe(other)
    expect(screen.getByText('Changed demo subject')).toBeInTheDocument()
    expect(screen.getByTestId('storage-error')).toHaveTextContent('conflict')
  })
})

const OverlayProbe = () => {
  const store = useDemoStore()
  return (
    <div>
      <span data-testid="overlay">
        {JSON.stringify(store.overlays['api-case'] ?? null)}
      </span>
      <span data-testid="count">{store.cases.length}</span>
      <button
        onClick={() =>
          store.updateCase('api-case', {
            responseText: 'Projekt',
            subject: 'Ignored server field',
          })
        }
      >
        Overlay
      </button>
      <button onClick={() => store.addCase(store.cases[0])}>Duplicate</button>
    </div>
  )
}

describe('local data of cases stored on the server', () => {
  it('keeps only local fields of an unknown case', async () => {
    const user = userEvent.setup()
    render(
      <DemoProvider>
        <OverlayProbe />
      </DemoProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Overlay' }))
    expect(screen.getByTestId('overlay')).toHaveTextContent(
      '{"responseText":"Projekt"}',
    )
    expect(
      JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)!).overlays,
    ).toEqual({ 'api-case': { responseText: 'Projekt' } })
  })

  it('restores snapshots saved before overlays existed', () => {
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        cases: createDemoCases(),
      }),
    )
    render(
      <DemoProvider>
        <DemoProbe />
      </DemoProvider>,
    )
    expect(screen.getByTestId('storage-error')).toBeEmptyDOMElement()
  })

  it('rejects a malformed overlay with a visible error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        cases: createDemoCases(),
        overlays: { 'api-case': { sentAt: 'not-a-date' } },
      }),
    )
    render(
      <DemoProvider>
        <DemoProbe />
      </DemoProvider>,
    )
    expect(screen.getByTestId('storage-error')).toHaveTextContent('restore')
  })

  it('ignores adding a case with an id that already exists', async () => {
    const user = userEvent.setup()
    render(
      <DemoProvider>
        <OverlayProbe />
      </DemoProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Duplicate' }))
    expect(screen.getByTestId('count')).toHaveTextContent('10')
  })

  it('treats e-mail addresses that differ only in case as one user', () => {
    setSession({ email: 'User@Example.test', accessToken: 'token' })
    const cases = createDemoCases()
    cases[0].subject = 'Zapisane dla małych liter'
    localStorage.setItem(
      `${DEMO_STORAGE_KEY}:user@example.test`,
      JSON.stringify({ version: 1, cases }),
    )
    render(
      <DemoProvider>
        <DemoProbe />
      </DemoProvider>,
    )
    expect(screen.getByText('Zapisane dla małych liter')).toBeInTheDocument()
    clearSession()
  })

  it('moves copies of API cases saved by earlier versions into overlays', () => {
    const cases = [
      ...createDemoCases(),
      {
        ...createDemoCases()[0],
        id: 'api-case',
        apiStatus: 'NEW',
        subject: 'Stara kopia z serwera',
        responseText: 'Moja odpowiedź',
      },
    ]
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({ version: 1, cases }),
    )
    render(
      <DemoProvider>
        <OverlayProbe />
      </DemoProvider>,
    )
    expect(screen.getByTestId('count')).toHaveTextContent('10')
    const overlay = JSON.parse(screen.getByTestId('overlay').textContent!)
    expect(overlay.responseText).toBe('Moja odpowiedź')
    expect(overlay).not.toHaveProperty('subject')
  })
})
