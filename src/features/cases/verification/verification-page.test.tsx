import * as casesApi from '@/api/cases/cases.api'
import { theme } from '@/app/theme'
import { LocalStoreProvider, useLocalStore } from '@/features/cases/local-store'
import type { UploadDraft } from '@/features/cases/types'
import { detail } from '@/test/case-detail'
import { createTestQueryClient } from '@/test/query-client'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, AxiosHeaders } from 'axios'
import { useEffect } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VerificationPage } from './verification-page'

vi.mock('@/api/cases/cases.api', () => ({
  createCase: vi.fn(),
  getDeadlinePreview: vi.fn(),
  checkCaseNumber: vi.fn(),
  setCaseQuestions: vi.fn(),
  setCaseDepartments: vi.fn(),
}))

const draft: UploadDraft = {
  file: new File(['abc'], 'wniosek.pdf', { type: 'application/pdf' }),
  applicant: 'Jan Testowy',
  subject: 'Testowy temat',
  writtenAt: '2026-11-20',
  applicantEmail: '',
  applicantAddress: '',
  receivedAt: '2026-11-21',
  requestText: 'Pierwsze pytanie.\nDrugie pytanie?',
  questions: [{ text: 'Pytanie AI', departmentId: 'dep-1' }],
  departments: [
    { id: 'dep-1', name: 'Wydział testowy', reason: 'Prowadzi rejestr' },
  ],
  aiStatus: 'USED',
}

const submitLabel = 'Utwórz sprawę i przejdź do analizy'

const failWith = (status: number, data: unknown = {}) =>
  new AxiosError('Failed', undefined, undefined, null, {
    data,
    status,
    statusText: 'Error',
    headers: {},
    config: { headers: new AxiosHeaders() },
  })

const Seed = ({ value }: { value: UploadDraft }) => {
  const { setUploadDraft } = useLocalStore()
  useEffect(() => {
    setUploadDraft(value)
  }, [setUploadDraft, value])
  return null
}

const Destination = () => {
  const { overlays, uploadDraft } = useLocalStore()
  const location = useLocation()
  return (
    <div>
      <div data-testid="path">{location.pathname}</div>
      <div data-testid="snapshot">
        {JSON.stringify({ overlays, uploadDraft })}
      </div>
    </div>
  )
}

const renderPage = (value?: UploadDraft) =>
  render(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={['/sprawy/nowy/weryfikacja']}>
          <LocalStoreProvider>
            {value && <Seed value={value} />}
            <Routes>
              <Route
                path="/sprawy/nowy/weryfikacja"
                element={<VerificationPage />}
              />
              <Route path="/sprawy/:id/analiza" element={<Destination />} />
            </Routes>
          </LocalStoreProvider>
        </MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>,
  )

const submit = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(await screen.findByRole('button', { name: submitLabel }))

beforeEach(() => {
  localStorage.clear()
  vi.mocked(casesApi.setCaseQuestions).mockResolvedValue(detail)
  vi.mocked(casesApi.setCaseDepartments).mockResolvedValue(detail)
  vi.mocked(casesApi.getDeadlinePreview).mockResolvedValue({
    receivedAt: '2026-11-21',
    dueAt: '2026-12-05',
    maxExtendedDueAt: '2027-01-04',
  })
  vi.mocked(casesApi.checkCaseNumber).mockImplementation(
    async ({ caseNumber }) => ({ caseNumber, available: true }),
  )
})
afterEach(() => vi.clearAllMocks())

describe('weryfikacja wniosku', () => {
  it('wyjaśnia brak szkicu i prowadzi do wyboru pliku', () => {
    renderPage()
    expect(screen.getByText('Brak wniosku do weryfikacji')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Wybierz plik' })).toHaveAttribute(
      'href',
      '/sprawy/nowy',
    )
  })

  it('tworzy sprawę przez API i przechodzi do analizy z id z backendu', async () => {
    vi.mocked(casesApi.createCase).mockResolvedValue({
      ...detail,
      id: 'server-id',
    })
    const user = userEvent.setup()
    renderPage(draft)
    expect(await screen.findByText('wniosek.pdf')).toBeInTheDocument()
    expect(
      screen.getByText(/Termin jest wyliczany automatycznie/),
    ).toBeVisible()
    expect(await screen.findByLabelText('Termin odpowiedzi')).toHaveValue(
      '2026-12-05',
    )
    expect(casesApi.getDeadlinePreview).toHaveBeenCalledWith(
      '2026-11-21',
      expect.anything(),
    )
    await user.type(
      screen.getByLabelText('Znak / numer sprawy *'),
      '  NOWA/1  ',
    )
    await submit(user)

    expect(await screen.findByTestId('path')).toHaveTextContent(
      '/sprawy/server-id/analiza',
    )
    expect(casesApi.createCase).toHaveBeenCalledTimes(1)
    expect(vi.mocked(casesApi.createCase).mock.calls[0][0]).toEqual({
      file: draft.file,
      caseNumber: 'NOWA/1',
      requesterName: 'Jan Testowy',
      subject: 'Testowy temat',
      receivedAt: '2026-11-21',
      writtenAt: '2026-11-20',
      requestText: 'Pierwsze pytanie.\nDrugie pytanie?',
    })
    const data = JSON.parse(screen.getByTestId('snapshot').textContent || '{}')
    expect(data.uploadDraft).toBeNull()
    expect(data.overlays['server-id']).toEqual({
      analysisNeedsReview: true,
      departmentReasons: { 'dep-1': 'Prowadzi rejestr' },
    })
    expect(vi.mocked(casesApi.setCaseQuestions).mock.calls[0][0]).toEqual({
      id: 'server-id',
      questions: [{ text: 'Pytanie AI', departmentId: 'dep-1' }],
    })
    expect(vi.mocked(casesApi.setCaseDepartments).mock.calls[0][0]).toEqual({
      id: 'server-id',
      departmentIds: ['dep-1'],
    })
  })

  it('bez pytań od AI dzieli tekst wniosku na pytania', async () => {
    vi.mocked(casesApi.createCase).mockResolvedValue(detail)
    const user = userEvent.setup()
    renderPage({ ...draft, questions: [], departments: [] })
    await user.type(
      await screen.findByLabelText('Znak / numer sprawy *'),
      'A/1',
    )
    await submit(user)
    await screen.findByTestId('path')
    expect(vi.mocked(casesApi.setCaseQuestions).mock.calls[0][0]).toEqual({
      id: detail.id,
      questions: [{ text: 'Pierwsze pytanie.' }, { text: 'Drugie pytanie?' }],
    })
    expect(casesApi.setCaseDepartments).not.toHaveBeenCalled()
  })

  it('przechodzi do analizy, gdy zapis pytań się nie powiódł', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(casesApi.createCase).mockResolvedValue(detail)
    vi.mocked(casesApi.setCaseQuestions).mockRejectedValue(failWith(500))
    const user = userEvent.setup()
    renderPage(draft)
    await user.type(
      await screen.findByLabelText('Znak / numer sprawy *'),
      'A/1',
    )
    await submit(user)
    expect(await screen.findByTestId('path')).toHaveTextContent('/analiza')
  })

  it('wysyła sprawę tylko raz przy podwójnym zatwierdzeniu', async () => {
    vi.mocked(casesApi.createCase).mockResolvedValue(detail)
    const user = userEvent.setup()
    renderPage(draft)
    await user.type(
      await screen.findByLabelText('Znak / numer sprawy *'),
      'A/1',
    )
    const form = screen
      .getByRole('button', { name: submitLabel })
      .closest('form')
    if (!form) throw new Error('Form not found')
    fireEvent.submit(form)
    fireEvent.submit(form)
    await screen.findByTestId('path')
    expect(casesApi.createCase).toHaveBeenCalledTimes(1)
  })

  it('pokazuje ostrzeżenia i wypełnia sugerowany numer sprawy', async () => {
    renderPage({
      ...draft,
      reference: 'NOWA/123',
      textExtractionStatus: 'NO_TEXT',
      requestText: '',
      warnings: ['TEXT_NOT_FOUND', 'CASE_NUMBER_TAKEN'],
    })
    expect(await screen.findByLabelText('Znak / numer sprawy *')).toHaveValue(
      'NOWA/123',
    )
    expect(
      screen.getByText('Nie znaleziono tekstu w pliku. Uzupełnij go ręcznie.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Nie znaleziono tekstu w pliku.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Sugerowany numer sprawy jest już zajęty/),
    ).toBeInTheDocument()
  })

  it('odrzuca puste dane bez wywołania API', async () => {
    const user = userEvent.setup()
    renderPage(draft)
    await screen.findByText('wniosek.pdf')
    fireEvent.change(screen.getByLabelText('Temat sprawy *'), {
      target: { value: '   ' },
    })
    fireEvent.change(screen.getByLabelText('Data wpływu *'), {
      target: { value: '' },
    })
    await submit(user)
    await waitFor(() =>
      expect(
        screen.getAllByText('To pole jest wymagane.').length,
      ).toBeGreaterThanOrEqual(3),
    )
    expect(casesApi.createCase).not.toHaveBeenCalled()
  })

  it('podpowiada numer zajęty według case-number-check i blokuje zapis', async () => {
    vi.mocked(casesApi.checkCaseNumber).mockResolvedValue({
      caseNumber: 'A/1',
      available: false,
      conflict: 'SEQUENCE_NUMBER_TAKEN',
    })
    const user = userEvent.setup()
    renderPage(draft)
    await user.type(
      await screen.findByLabelText('Znak / numer sprawy *'),
      'A/1',
    )
    expect(
      await screen.findByText('Ten numer kolejny w roku jest już zajęty.'),
    ).toBeInTheDocument()
    await submit(user)
    expect(casesApi.createCase).not.toHaveBeenCalled()
  })

  it('409 z kodem SEQUENCE_NUMBER_TAKEN pokazuje komunikat o numerze kolejnym', async () => {
    vi.mocked(casesApi.createCase).mockRejectedValue(
      failWith(409, { code: 'SEQUENCE_NUMBER_TAKEN' }),
    )
    const user = userEvent.setup()
    renderPage(draft)
    await user.type(
      await screen.findByLabelText('Znak / numer sprawy *'),
      'A/1',
    )
    await submit(user)
    expect(
      await screen.findByText('Ten numer kolejny w roku jest już zajęty.'),
    ).toBeInTheDocument()
  })

  it('409 oznacza zajęty numer sprawy przy polu numeru', async () => {
    vi.mocked(casesApi.createCase).mockRejectedValue(failWith(409))
    const user = userEvent.setup()
    renderPage(draft)
    await user.type(
      await screen.findByLabelText('Znak / numer sprawy *'),
      'A/1',
    )
    await submit(user)
    expect(
      await screen.findByText('Sprawa o takim znaku już istnieje.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('path')).not.toBeInTheDocument()
  })

  it('400 przy dacie z przyszłości oznacza pole daty wpływu', async () => {
    vi.mocked(casesApi.createCase).mockRejectedValue(failWith(400))
    const user = userEvent.setup()
    renderPage({ ...draft, receivedAt: '2999-01-01' })
    await user.type(
      await screen.findByLabelText('Znak / numer sprawy *'),
      'A/1',
    )
    await submit(user)
    expect(
      await screen.findByText('Data wpływu nie może być z przyszłości.'),
    ).toBeInTheDocument()
  })

  it.each([
    [413, 'Plik jest zbyt duży.'],
    [415, /Ten format pliku nie jest obsługiwany/],
    [500, 'Nie udało się utworzyć sprawy. Spróbuj ponownie.'],
  ])(
    'błąd %s pokazuje czytelny komunikat i pozwala spróbować ponownie',
    async (status, message) => {
      vi.mocked(casesApi.createCase).mockRejectedValueOnce(failWith(status))
      vi.mocked(casesApi.createCase).mockResolvedValueOnce(detail)
      const user = userEvent.setup()
      renderPage(draft)
      await user.type(
        await screen.findByLabelText('Znak / numer sprawy *'),
        'A/1',
      )
      await submit(user)
      expect(await screen.findByText(message)).toBeInTheDocument()
      await submit(user)
      await screen.findByTestId('path')
      expect(casesApi.createCase).toHaveBeenCalledTimes(2)
    },
  )
})
