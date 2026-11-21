import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEMO_TODAY } from '@/features/demo/demo-data'
import {
  DEMO_STORAGE_KEY,
  DemoProvider,
  useDemoStore,
} from '@/features/demo/demo-store'
import { UploadPage } from './upload-page'

const Verification = () => {
  const { uploadDraft } = useDemoStore()
  return (
    <div data-testid="draft">
      {JSON.stringify(
        uploadDraft && { ...uploadDraft, file: uploadDraft.file.name },
      )}
    </div>
  )
}

const DraftStatus = () => {
  const { uploadDraft } = useDemoStore()
  return (
    <div data-testid="draft-status">{uploadDraft?.file.name ?? 'empty'}</div>
  )
}

const renderPage = () =>
  render(
    <DemoProvider>
      <DraftStatus />
      <MemoryRouter initialEntries={['/sprawy/nowy']}>
        <Routes>
          <Route path="/sprawy/nowy" element={<UploadPage />} />
          <Route path="/sprawy/nowy/weryfikacja" element={<Verification />} />
          <Route path="/sprawy" element={<div>Rejestr spraw</div>} />
        </Routes>
      </MemoryRouter>
    </DemoProvider>,
  )

const select = (file: File) =>
  fireEvent.change(
    screen.getByLabelText('Wybierz plik z dysku', { selector: 'input' }),
    { target: { files: [file] } },
  )
const pdf = () => new File(['abc'], 'wniosek.pdf', { type: 'application/pdf' })

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe('UploadPage', () => {
  it('selects and processes a real file and passes explicitly simulated data to verification', () => {
    vi.useFakeTimers()
    renderPage()
    const next = screen.getByRole('button', { name: /Dalej: Weryfikacja/ })
    expect(next).toBeDisabled()
    expect(
      screen.getByText(/Treść pliku nie jest odczytywana/),
    ).toBeInTheDocument()
    select(pdf())
    expect(screen.getByRole('status')).toHaveTextContent(
      'Symulowanie przetwarzania',
    )
    expect(next).toBeDisabled()
    act(() => vi.advanceTimersByTime(900))
    expect(screen.getAllByText('wniosek.pdf').length).toBeGreaterThan(0)
    expect(screen.getByText('Rozmiar: 3 bajtów')).toBeInTheDocument()
    expect(next).toBeEnabled()
    fireEvent.click(next)
    const draft = JSON.parse(screen.getByTestId('draft').textContent || '{}')
    expect(draft).toMatchObject({
      file: 'wniosek.pdf',
      applicant: 'Wnioskodawca demonstracyjny',
      receivedAt: DEMO_TODAY,
      writtenAt: DEMO_TODAY,
    })
    expect(draft.requestText).toContain('Przykład demonstracyjny')
    expect(localStorage.getItem(DEMO_STORAGE_KEY) ?? '').not.toContain(
      'wniosek.pdf',
    )
  })

  it.each([
    [new File([], 'empty.pdf', { type: 'application/pdf' }), /Plik jest pusty/],
    [
      new File(['a'], 'bad.txt', { type: 'text/plain' }),
      /Nieobsługiwane rozszerzenie/,
    ],
    [
      new File(['a'], 'bad.pdf', { type: 'text/plain' }),
      /Typ pliku nie odpowiada/,
    ],
    [
      new File([new Uint8Array(25 * 1024 * 1024 + 1)], 'big.pdf', {
        type: 'application/pdf',
      }),
      /Plik jest zbyt duży/,
    ],
  ])('reports invalid file %s', (file, message) => {
    renderPage()
    select(file)
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(
      screen.getByRole('button', { name: /Dalej: Weryfikacja/ }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: 'Spróbuj ponownie' }),
    ).toBeEnabled()
  })

  it('clears the old draft and cancels pending processing on replacement, removal and unmount', () => {
    vi.useFakeTimers()
    const { unmount } = renderPage()
    select(pdf())
    act(() => vi.advanceTimersByTime(900))
    expect(screen.getByTestId('draft-status')).toHaveTextContent('wniosek.pdf')
    select(new File(['x'], 'bad.txt', { type: 'text/plain' }))
    expect(screen.getByTestId('draft-status')).toHaveTextContent('empty')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nieobsługiwane rozszerzenie',
    )
    expect(
      screen.getByRole('button', { name: /Dalej: Weryfikacja/ }),
    ).toBeDisabled()
    select(pdf())
    fireEvent.click(screen.getByRole('button', { name: 'Usuń plik' }))
    act(() => vi.advanceTimersByTime(900))
    expect(
      screen.getByRole('button', { name: /Dalej: Weryfikacja/ }),
    ).toBeDisabled()
    select(pdf())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('accepts a dropped DOCX and rejects multiple dropped files', () => {
    vi.useFakeTimers()
    renderPage()
    const zone = screen.getByText(
      'Przeciągnij plik PDF lub DOCX tutaj',
    ).parentElement!
    fireEvent.drop(zone, { dataTransfer: { files: [pdf(), pdf()] } })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Wybierz tylko jeden plik',
    )
    fireEvent.drop(zone, {
      dataTransfer: {
        files: [
          new File(['abc'], 'wniosek.docx', {
            type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          }),
        ],
      },
    })
    act(() => vi.advanceTimersByTime(900))
    expect(screen.getAllByText('wniosek.docx').length).toBeGreaterThan(0)
  })

  it('opens the file picker with the keyboard', async () => {
    const user = userEvent.setup()
    renderPage()
    const input = screen.getByLabelText('Wybierz plik z dysku', {
      selector: 'input',
    })
    const click = vi.spyOn(input, 'click')
    screen.getByRole('button', { name: 'Wybierz plik z dysku' }).focus()
    await user.keyboard('{Enter}')
    expect(click).toHaveBeenCalledOnce()
  })
})
