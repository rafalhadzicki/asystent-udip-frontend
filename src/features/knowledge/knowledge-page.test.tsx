import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as knowledgeApi from '@/api/knowledge/knowledge.api'
import type { KnowledgeDocument } from '@/api/knowledge/knowledge.schemas'
import { createTestQueryClient } from '@/test/query-client'
import { KnowledgePage } from './knowledge-page'
import { MAX_KNOWLEDGE_FILE_BYTES } from './knowledge-constants'

vi.mock('@/api/knowledge/knowledge.api', () => ({
  getKnowledgeList: vi.fn(),
  getKnowledgeDocument: vi.fn(),
  createKnowledgeDocument: vi.fn(),
  updateKnowledgeDocument: vi.fn(),
  deleteKnowledgeDocument: vi.fn(),
  reindexKnowledgeDocument: vi.fn(),
}))

const api = vi.mocked(knowledgeApi)

const doc = (
  overrides: Partial<KnowledgeDocument> = {},
): KnowledgeDocument => ({
  id: 'doc-1',
  name: 'Ustawa o dostępie do informacji publicznej',
  category: 'LAW',
  originalName: 'ustawa.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1000,
  textExtractionStatus: 'EXTRACTED',
  indexStatus: 'INDEXED',
  chunkCount: 3,
  uploadedBy: { id: 'u', email: 'u@example.test' },
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
  ...overrides,
})

const list = (...items: KnowledgeDocument[]) =>
  api.getKnowledgeList.mockResolvedValue({ items, total: items.length })

const failure = (status: number) =>
  new AxiosError('x', undefined, undefined, null, {
    data: {},
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

const renderPage = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <KnowledgePage />
    </QueryClientProvider>,
  )

const tableRows = async () =>
  within(await screen.findByRole('table'))
    .getAllByRole('row')
    .slice(1)

describe('KnowledgePage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    list(doc())
  })

  it('shows documents from the server with their indexing status', async () => {
    list(doc(), doc({ id: 'doc-2', name: 'Wzór', indexStatus: 'FAILED' }))
    renderPage()
    expect(await tableRows()).toHaveLength(2)
    expect(screen.getByText('Zindeksowany')).toBeInTheDocument()
    expect(screen.getByText('Błąd indeksacji')).toBeInTheDocument()
    expect(api.getKnowledgeList.mock.calls[0][0]).toEqual({
      q: undefined,
      category: undefined,
      limit: 5,
      offset: 0,
    })
  })

  it('filters on the server by search and category (upper case)', async () => {
    const user = userEvent.setup()
    renderPage()
    await tableRows()
    await user.type(
      screen.getByRole('searchbox', { name: 'Szukaj w bazie wiedzy' }),
      'ustawa',
    )
    await waitFor(() =>
      expect(api.getKnowledgeList).toHaveBeenLastCalledWith(
        { q: 'ustawa', category: undefined, limit: 5, offset: 0 },
        expect.anything(),
      ),
    )
    await user.click(screen.getByRole('button', { name: 'Wytyczne' }))
    await waitFor(() =>
      expect(api.getKnowledgeList).toHaveBeenLastCalledWith(
        { q: 'ustawa', category: 'GUIDELINE', limit: 5, offset: 0 },
        expect.anything(),
      ),
    )
  })

  it('shows the empty state and an error with a retry', async () => {
    const user = userEvent.setup()
    api.getKnowledgeList.mockRejectedValueOnce(failure(500))
    list()
    renderPage()
    expect(
      await screen.findByText('Nie udało się wczytać bazy wiedzy.'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }))
    expect(
      await screen.findByText(
        'Baza wiedzy jest pusta. Dodaj pierwszy dokument.',
      ),
    ).toBeInTheDocument()
  })

  it('paginates on the server', async () => {
    const user = userEvent.setup()
    api.getKnowledgeList.mockResolvedValue({
      items: Array.from({ length: 5 }, (_, index) =>
        doc({ id: `d-${index}`, name: `Dokument ${index}` }),
      ),
      total: 7,
    })
    renderPage()
    expect(await tableRows()).toHaveLength(5)
    expect(screen.getByText('1–5 z 7')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Następna strona' }))
    await waitFor(() =>
      expect(api.getKnowledgeList).toHaveBeenLastCalledWith(
        { q: undefined, category: undefined, limit: 5, offset: 5 },
        expect.anything(),
      ),
    )
  })

  it('validates the form and uploads the file to the server', async () => {
    api.createKnowledgeDocument.mockResolvedValue(doc())
    const user = userEvent.setup({ applyAccept: false })
    renderPage()
    await tableRows()
    await user.click(screen.getByRole('button', { name: 'Dodaj dokument' }))
    const dialog = screen.getByRole('dialog', {
      name: 'Dodaj dokument do bazy wiedzy',
    })
    await user.type(within(dialog).getByLabelText(/Nazwa dokumentu/), '   ')
    await user.click(
      within(dialog).getByRole('button', { name: 'Dodaj dokument' }),
    )
    expect(
      within(dialog).getByText('Podaj nazwę dokumentu.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('Wybierz kategorię.')).toBeInTheDocument()
    expect(
      within(dialog).getByText('Wybierz plik PDF, DOCX lub TXT.'),
    ).toBeInTheDocument()

    const fileInput = within(dialog).getByLabelText(/^Plik/)
    await user.upload(
      fileInput,
      new File(['x'], 'obraz.png', { type: 'image/png' }),
    )
    expect(
      await within(dialog).findByText(/Nieobsługiwany format pliku/),
    ).toBeInTheDocument()
    const large = new File(['x'], 'duzy.pdf', { type: 'application/pdf' })
    Object.defineProperty(large, 'size', {
      value: MAX_KNOWLEDGE_FILE_BYTES + 1,
    })
    await user.upload(fileInput, large)
    expect(
      await within(dialog).findByText(/Plik jest za duży/),
    ).toBeInTheDocument()
    expect(api.createKnowledgeDocument).not.toHaveBeenCalled()

    const file = new File(['treść'], 'wytyczne.docx')
    await user.upload(fileInput, file)
    await user.type(
      within(dialog).getByLabelText(/Nazwa dokumentu/),
      'Nowe wytyczne  ',
    )
    await user.selectOptions(
      within(dialog).getByLabelText(/Kategoria/),
      'GUIDELINE',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Dodaj dokument' }),
    )
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    )
    expect(api.createKnowledgeDocument.mock.calls[0][0]).toEqual({
      file,
      name: 'Nowe wytyczne',
      category: 'GUIDELINE',
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      'Dodano dokument „Nowe wytyczne”.',
    )
  })

  it('shows a server error for a file that is too large and keeps the form open', async () => {
    api.createKnowledgeDocument.mockRejectedValue(failure(413))
    const user = userEvent.setup({ applyAccept: false })
    renderPage()
    await tableRows()
    await user.click(screen.getByRole('button', { name: 'Dodaj dokument' }))
    const dialog = screen.getByRole('dialog')
    await user.upload(
      within(dialog).getByLabelText(/^Plik/),
      new File(['x'], 'a.txt', { type: 'text/plain' }),
    )
    await user.type(within(dialog).getByLabelText(/Nazwa dokumentu/), 'A')
    await user.selectOptions(within(dialog).getByLabelText(/Kategoria/), 'LAW')
    await user.click(
      within(dialog).getByRole('button', { name: 'Dodaj dokument' }),
    )
    expect(
      await within(dialog).findByText(/Plik jest za duży/),
    ).toBeInTheDocument()
  })

  it('edits the name and category without replacing the file', async () => {
    api.updateKnowledgeDocument.mockResolvedValue(doc())
    const user = userEvent.setup()
    renderPage()
    await tableRows()
    await user.click(
      screen.getByRole('button', {
        name: 'Edytuj: Ustawa o dostępie do informacji publicznej',
      }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Edytuj dokument' })
    expect(within(dialog).queryByLabelText(/^Plik/)).not.toBeInTheDocument()
    const name = within(dialog).getByLabelText(/Nazwa dokumentu/)
    await user.clear(name)
    await user.click(
      within(dialog).getByRole('button', { name: 'Zapisz zmiany' }),
    )
    expect(
      within(dialog).getByText('Podaj nazwę dokumentu.'),
    ).toBeInTheDocument()
    await user.type(name, 'Ustawa v2')
    await user.selectOptions(
      within(dialog).getByLabelText(/Kategoria/),
      'RESPONSE',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Zapisz zmiany' }),
    )
    await waitFor(() => expect(api.updateKnowledgeDocument).toHaveBeenCalled())
    expect(api.updateKnowledgeDocument.mock.calls[0][0]).toEqual({
      id: 'doc-1',
      name: 'Ustawa v2',
      category: 'RESPONSE',
    })
  })

  it('deletes a document after confirmation', async () => {
    api.deleteKnowledgeDocument.mockResolvedValue()
    const user = userEvent.setup()
    renderPage()
    await tableRows()
    await user.click(
      screen.getByRole('button', {
        name: 'Usuń: Ustawa o dostępie do informacji publicznej',
      }),
    )
    expect(api.deleteKnowledgeDocument).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Usuń dokument' }))
    await waitFor(() => expect(api.deleteKnowledgeDocument).toHaveBeenCalled())
    expect(api.deleteKnowledgeDocument.mock.calls[0][0]).toBe('doc-1')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Usunięto dokument',
    )
  })

  it('allows reindexing only pending and failed documents', async () => {
    list(
      doc({ id: 'a', name: 'Zindeksowany', indexStatus: 'INDEXED' }),
      doc({ id: 'b', name: 'Oczekujący', indexStatus: 'PENDING' }),
    )
    api.reindexKnowledgeDocument.mockResolvedValue(
      doc({ id: 'b', indexStatus: 'INDEXED' }),
    )
    const user = userEvent.setup()
    renderPage()
    await tableRows()
    expect(
      screen.queryByRole('button', { name: 'Indeksuj ponownie: Zindeksowany' }),
    ).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Indeksuj ponownie: Oczekujący' }),
    )
    await waitFor(() => expect(api.reindexKnowledgeDocument).toHaveBeenCalled())
    expect(api.reindexKnowledgeDocument.mock.calls[0][0]).toBe('b')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Status: Zindeksowany',
    )
  })

  it('reports when the AI is not configured during reindexing', async () => {
    list(doc({ indexStatus: 'PENDING' }))
    api.reindexKnowledgeDocument.mockRejectedValue(failure(503))
    const user = userEvent.setup()
    renderPage()
    await tableRows()
    await user.click(screen.getByRole('button', { name: /Indeksuj ponownie/ }))
    expect(
      await screen.findByText(/Funkcje AI są obecnie niedostępne/),
    ).toBeInTheDocument()
  })

  it('shows the extracted text in the preview', async () => {
    api.getKnowledgeDocument.mockResolvedValue({
      ...doc(),
      extractedText: 'Art. 1. Treść ustawy.',
    })
    const user = userEvent.setup()
    renderPage()
    await tableRows()
    await user.click(
      screen.getByRole('button', {
        name: 'Podgląd: Ustawa o dostępie do informacji publicznej',
      }),
    )
    const preview = screen.getByRole('dialog', { name: 'Podgląd dokumentu' })
    expect(within(preview).getByText('ustawa.pdf')).toBeInTheDocument()
    expect(within(preview).getByText(/3 fragmenty/)).toBeInTheDocument()
    expect(
      await within(preview).findByText('Art. 1. Treść ustawy.'),
    ).toBeInTheDocument()
  })
})
