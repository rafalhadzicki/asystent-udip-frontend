import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEMO_STORAGE_KEY,
  DemoProvider,
  useDemoStore,
} from '@/features/demo/demo-store'
import { UploadPage } from './upload-page'
import * as casesApi from '@/api/cases/cases.api'
import type { RequestAnalysis } from '@/api/cases/cases.schemas'
import { createTestQueryClient } from '@/test/query-client'

const response: RequestAnalysis = {
  fileName: 'wniosek.pdf',
  textExtractionStatus: 'EXTRACTED',
  extractedText: 'Odczytana treść',
  suggestions: {
    caseNumber: { value: 'TEST/1', source: 'TEXT' },
    subject: { value: 'Temat', source: 'TEXT' },
    receivedAt: { value: '2026-11-20', source: 'TEXT' },
  },
  warnings: ['CASE_NUMBER_TAKEN'],
}

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
    <QueryClientProvider client={createTestQueryClient()}>
      <DemoProvider>
        <DraftStatus />
        <MemoryRouter initialEntries={['/sprawy/nowy']}>
          <Routes>
            <Route path="/sprawy/nowy" element={<UploadPage />} />
            <Route path="/sprawy/nowy/weryfikacja" element={<Verification />} />
            <Route path="/sprawy" element={<div>Rejestr spraw</div>} />
          </Routes>
        </MemoryRouter>
      </DemoProvider>
    </QueryClientProvider>,
  )

const select = (file: File) =>
  fireEvent.change(
    screen.getByLabelText('Wybierz plik z dysku', { selector: 'input' }),
    { target: { files: [file] } },
  )
const pdf = () => new File(['abc'], 'wniosek.pdf', { type: 'application/pdf' })

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('UploadPage', () => {
  it('passes API suggestions and warnings to verification', async () => {
    const analyze = vi
      .spyOn(casesApi, 'analyzeRequest')
      .mockResolvedValue(response)
    renderPage()
    const next = screen.getByRole('button', { name: /Dalej: Weryfikacja/ })
    expect(next).toBeDisabled()
    expect(
      screen.getByText(/Wybrany plik zostanie wysłany do API/),
    ).toBeInTheDocument()
    select(pdf())
    expect(
      await screen.findByText('Plik gotowy do weryfikacji'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('wniosek.pdf').length).toBeGreaterThan(0)
    expect(screen.getByText('Rozmiar: 3 bajtów')).toBeInTheDocument()
    expect(next).toBeEnabled()
    fireEvent.click(next)
    const draft = JSON.parse(screen.getByTestId('draft').textContent || '{}')
    expect(draft).toMatchObject({
      file: 'wniosek.pdf',
      applicant: '',
      reference: 'TEST/1',
      subject: 'Temat',
      receivedAt: '2026-11-20',
      writtenAt: '',
      requestText: 'Odczytana treść',
      warnings: ['CASE_NUMBER_TAKEN'],
    })
    expect(analyze.mock.calls[0][0]).toBeInstanceOf(File)
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

  it('clears the draft and ignores pending results on replacement, removal and unmount', async () => {
    let resolve: (value: RequestAnalysis) => void = () => {}
    const analyze = vi
      .spyOn(casesApi, 'analyzeRequest')
      .mockResolvedValueOnce(response)
      .mockImplementation(
        () =>
          new Promise((done) => {
            resolve = done
          }),
      )
    const { unmount } = renderPage()
    select(pdf())
    await screen.findByText('Plik gotowy do weryfikacji')
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
    await waitFor(() => expect(analyze).toHaveBeenCalledTimes(2))
    const signal = analyze.mock.calls.at(-1)?.[1]
    fireEvent.click(screen.getByRole('button', { name: 'Usuń plik' }))
    expect(signal?.aborted).toBe(true)
    await act(async () => resolve(response))
    expect(
      screen.getByRole('button', { name: /Dalej: Weryfikacja/ }),
    ).toBeDisabled()
    select(pdf())
    await waitFor(() => expect(analyze).toHaveBeenCalledTimes(3))
    const unmountSignal = analyze.mock.calls.at(-1)?.[1]
    unmount()
    expect(unmountSignal?.aborted).toBe(true)
  })

  it('accepts a dropped DOCX and rejects multiple dropped files', async () => {
    vi.spyOn(casesApi, 'analyzeRequest').mockResolvedValue(response)
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
    expect(
      await screen.findByText('Plik gotowy do weryfikacji'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('wniosek.docx').length).toBeGreaterThan(0)
  })

  it('shows a request error and allows retrying', async () => {
    vi.spyOn(casesApi, 'analyzeRequest').mockRejectedValue(new Error('network'))
    renderPage()
    select(pdf())
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nie udało się odczytać pliku przez API',
    )
    expect(
      screen.getByRole('button', { name: 'Spróbuj ponownie' }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /Dalej: Weryfikacja/ }),
    ).toBeDisabled()
  })

  it.each([
    [401, 'Sesja wygasła lub jest nieprawidłowa'],
    [413, 'Serwer odrzucił plik jako zbyt duży'],
    [415, 'Serwer nie rozpoznał pliku'],
  ])('shows a specific API error for HTTP %i', async (status, message) => {
    vi.spyOn(casesApi, 'analyzeRequest').mockRejectedValue(
      new AxiosError('error', undefined, undefined, undefined, {
        status,
        statusText: 'error',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {},
      }),
    )
    renderPage()
    select(pdf())
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
  })

  it('does not replace a newer draft when the previous request resolves late', async () => {
    let resolveFirst: (value: RequestAnalysis) => void = () => {}
    const analyze = vi
      .spyOn(casesApi, 'analyzeRequest')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve
          }),
      )
      .mockResolvedValueOnce({ ...response, extractedText: 'Nowsza treść' })
    renderPage()
    select(pdf())
    await waitFor(() => expect(analyze).toHaveBeenCalledTimes(1))
    select(new File(['new'], 'nowy.pdf', { type: 'application/pdf' }))
    await screen.findByText('Plik gotowy do weryfikacji')
    await act(async () => resolveFirst(response))
    fireEvent.click(screen.getByRole('button', { name: /Dalej: Weryfikacja/ }))
    const draft = JSON.parse(screen.getByTestId('draft').textContent || '{}')
    expect(draft.file).toBe('nowy.pdf')
    expect(draft.requestText).toBe('Nowsza treść')
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
