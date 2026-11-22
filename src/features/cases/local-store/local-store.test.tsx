import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearLocalStore,
  LocalStoreProvider,
  LOCAL_STORAGE_KEY,
  useLocalStore,
} from '.'
import { createDemoCases } from '@/test/demo-cases'
import { clearSession, setSession } from '@/api/session'

const Probe = () => {
  const store = useLocalStore()
  return (
    <div>
      <span data-testid="overlay">
        {JSON.stringify(store.overlays['case-1'] ?? null)}
      </span>
      <span data-testid="storage-error">{store.storageError}</span>
      <button
        onClick={() =>
          store.updateCase('case-1', {
            responseText: 'Projekt',
            subject: 'Ignored server field',
          })
        }
      >
        Change
      </button>
    </div>
  )
}

const renderProbe = () =>
  render(
    <LocalStoreProvider>
      <Probe />
    </LocalStoreProvider>,
  )

const silenceErrors = () =>
  vi.spyOn(console, 'error').mockImplementation(() => {})

const otherTabSnapshot = JSON.stringify({
  version: 1,
  overlays: { 'case-1': { responseText: 'Other tab' } },
})

beforeEach(() => localStorage.clear())

describe('local data store', () => {
  it('keeps only local fields of a case', async () => {
    const user = userEvent.setup()
    renderProbe()
    await user.click(screen.getByRole('button', { name: 'Change' }))
    expect(screen.getByTestId('overlay')).toHaveTextContent(
      '{"responseText":"Projekt"}',
    )
    expect(
      JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)!).overlays,
    ).toEqual({ 'case-1': { responseText: 'Projekt' } })
  })

  it('persists changes and restores them after remount', () => {
    const view = renderProbe()
    act(() => screen.getByText('Change').click())
    view.unmount()
    renderProbe()
    expect(screen.getByTestId('overlay')).toHaveTextContent('Projekt')
    expect(screen.getByTestId('storage-error')).toBeEmptyDOMElement()
  })

  it('keeps local data separate for each signed-in user', async () => {
    const user = userEvent.setup()
    setSession({ email: 'a@example.test', accessToken: 'a' })
    renderProbe()
    await user.click(screen.getByRole('button', { name: 'Change' }))
    expect(
      localStorage.getItem(`${LOCAL_STORAGE_KEY}:a@example.test`),
    ).toContain('Projekt')
    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBeNull()

    act(() => setSession({ email: 'b@example.test', accessToken: 'b' }))
    expect(screen.getByTestId('overlay')).toHaveTextContent('null')
    expect(
      localStorage.getItem(`${LOCAL_STORAGE_KEY}:b@example.test`),
    ).toBeNull()
    clearSession()
  })

  it('treats e-mail addresses that differ only in case as one user', () => {
    setSession({ email: 'User@Example.test', accessToken: 'token' })
    localStorage.setItem(
      `${LOCAL_STORAGE_KEY}:user@example.test`,
      JSON.stringify({
        version: 1,
        overlays: { 'case-1': { responseText: 'Zapisane' } },
      }),
    )
    renderProbe()
    expect(screen.getByTestId('overlay')).toHaveTextContent('Zapisane')
    clearSession()
  })

  it.each([
    [
      'a malformed date',
      JSON.stringify({
        version: 1,
        overlays: { 'case-1': { sentAt: 'invalid' } },
      }),
    ],
    ['corrupt JSON structure', '{"version":1,"overlays":[{}]}'],
  ])('reports %s explicitly rather than crashing', (_name, raw) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, raw)
    const log = silenceErrors()
    renderProbe()
    expect(screen.getByTestId('storage-error')).toHaveTextContent('restore')
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })

  it('reports write failures while preserving in-memory changes', () => {
    const log = silenceErrors()
    const write = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError')
      })
    renderProbe()
    act(() => screen.getByText('Change').click())
    expect(screen.getByTestId('storage-error')).toHaveTextContent('save')
    expect(screen.getByTestId('overlay')).toHaveTextContent('Projekt')
    write.mockRestore()
    log.mockRestore()
  })

  it('does not overwrite changes from another tab and keeps local edits in memory', () => {
    renderProbe()
    localStorage.setItem(LOCAL_STORAGE_KEY, otherTabSnapshot)
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: LOCAL_STORAGE_KEY,
          newValue: otherTabSnapshot,
          storageArea: localStorage,
        }),
      )
    })
    expect(screen.getByTestId('storage-error')).toHaveTextContent('conflict')
    act(() => screen.getByText('Change').click())
    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe(otherTabSnapshot)
    expect(screen.getByTestId('overlay')).toHaveTextContent('Projekt')
  })

  it('detects an external change before saving even without a storage event', () => {
    renderProbe()
    localStorage.setItem(LOCAL_STORAGE_KEY, otherTabSnapshot)
    act(() => screen.getByText('Change').click())
    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBe(otherTabSnapshot)
    expect(screen.getByTestId('overlay')).toHaveTextContent('Projekt')
    expect(screen.getByTestId('storage-error')).toHaveTextContent('conflict')
  })

  it('ignores local cases saved by earlier versions', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ version: 1, cases: createDemoCases() }),
    )
    renderProbe()
    expect(screen.getByTestId('storage-error')).toBeEmptyDOMElement()
    expect(screen.getByTestId('overlay')).toHaveTextContent('null')
  })

  it('moves copies of API cases saved by earlier versions into overlays', () => {
    const copy = {
      ...createDemoCases()[0],
      id: 'case-1',
      subject: 'Stara kopia z serwera',
      responseText: 'Moja odpowiedź',
    }
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ version: 1, cases: [copy] }),
    )
    renderProbe()
    const overlay = JSON.parse(screen.getByTestId('overlay').textContent!)
    expect(overlay.responseText).toBe('Moja odpowiedź')
    expect(overlay).not.toHaveProperty('subject')
  })
})

describe('clearLocalStore', () => {
  it('removes local data of every user and leaves other keys alone', () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, '{}')
    localStorage.setItem(`${LOCAL_STORAGE_KEY}:a@example.com`, '{}')
    localStorage.setItem('other', 'x')
    clearLocalStore()
    expect(localStorage.getItem(LOCAL_STORAGE_KEY)).toBeNull()
    expect(
      localStorage.getItem(`${LOCAL_STORAGE_KEY}:a@example.com`),
    ).toBeNull()
    expect(localStorage.getItem('other')).toBe('x')
  })
})
