import { useEffect } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEMO_STORAGE_KEY,
  DemoProvider,
  useDemoStore,
} from '@/features/demo/demo-store'
import type { UploadDraft } from '@/features/demo/types'
import { VerificationPage } from './verification-page'

const draft: UploadDraft = {
  file: new File(['abc'], 'wniosek.pdf', { type: 'application/pdf' }),
  applicant: 'Jan Testowy',
  subject: 'Testowy temat',
  writtenAt: '2026-11-20',
  receivedAt: '2026-11-21',
  requestText: 'Pierwsze pytanie.\nDrugie pytanie?',
}

const Seed = ({ value }: { value: UploadDraft }) => {
  const { setUploadDraft } = useDemoStore()
  useEffect(() => {
    setUploadDraft(value)
  }, [setUploadDraft, value])
  return null
}

const Destination = () => {
  const { cases, uploadDraft } = useDemoStore()
  const location = useLocation()
  return (
    <div>
      <div data-testid="path">{location.pathname}</div>
      <div data-testid="snapshot">{JSON.stringify({ cases, uploadDraft })}</div>
    </div>
  )
}

const renderPage = (value?: UploadDraft) =>
  render(
    <MemoryRouter initialEntries={['/sprawy/nowy/weryfikacja']}>
      <DemoProvider>
        {value && <Seed value={value} />}
        <Routes>
          <Route
            path="/sprawy/nowy/weryfikacja"
            element={<VerificationPage />}
          />
          <Route path="/sprawy/:id/analiza" element={<Destination />} />
        </Routes>
      </DemoProvider>
    </MemoryRouter>,
  )

beforeEach(() => localStorage.clear())

describe('weryfikacja wniosku', () => {
  it('wyjaśnia brak szkicu i prowadzi do wyboru pliku', () => {
    renderPage()
    expect(screen.getByText('Brak wniosku do weryfikacji')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Wybierz plik' })).toHaveAttribute(
      'href',
      '/sprawy/nowy',
    )
  })

  it('pokazuje faktyczne metadane, proponuje edytowalny termin i tworzy kompletną sprawę', async () => {
    const user = userEvent.setup()
    renderPage(draft)
    expect(await screen.findByText('wniosek.pdf')).toBeInTheDocument()
    expect(screen.getByText('Rozmiar: 3 bajtów')).toBeInTheDocument()
    expect(
      screen.getByText(/Sprawdź odczyt i sugestie API/),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Termin *')).toHaveValue('2026-12-05')
    fireEvent.change(screen.getByLabelText('Data wpływu *'), {
      target: { value: '2026-12-01' },
    })

    expect(screen.getByText(/15.12.2026/)).toBeInTheDocument()
    expect(screen.getByLabelText('Termin *')).toHaveValue('2026-12-05')
    await user.click(
      screen.getByRole('button', { name: 'Użyj proponowanej daty' }),
    )
    fireEvent.change(screen.getByLabelText('Termin *'), {
      target: { value: '2026-12-20' },
    })
    await user.type(
      screen.getByLabelText('Znak / numer sprawy *'),
      '  NOWA/1  ',
    )
    const form = screen
      .getByRole('button', {
        name: 'Utwórz sprawę i przejdź do analizy',
      })
      .closest('form')
    expect(form).not.toBeNull()
    if (!form) throw new Error('Form not found')
    fireEvent.submit(form)
    fireEvent.submit(form)
    const data = JSON.parse(
      (await screen.findByTestId('snapshot')).textContent || '{}',
    )
    const item = data.cases.at(-1)
    expect(data.cases).toHaveLength(11)
    expect(data.uploadDraft).toBeNull()
    expect(screen.getByTestId('path')).toHaveTextContent(
      `/sprawy/${item.id}/analiza`,
    )
    expect(item).toMatchObject({
      reference: 'NOWA/1',
      status: 'analysis',
      deadline: '2026-12-20',
      owner: 'Urzędnik demonstracyjny',
      source: { name: 'wniosek.pdf', size: 3 },
      materials: [],
      responseText: '',
      redactions: [],
      redactionConfirmed: false,
    })
    expect(item.questions).toMatchObject([
      { text: 'Pierwsze pytanie.', selected: false },
      { text: 'Drugie pytanie?', selected: false },
    ])
    expect(item.departments[0].selected).toBe(false)
    expect(item.source).not.toHaveProperty('file')
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || '{}').cases,
      ).toHaveLength(11),
    )
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
      screen.getByText('API nie znalazło tekstu w pliku.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Sugerowany numer sprawy jest już zajęty/),
    ).toBeInTheDocument()
  })

  it('odrzuca puste dane, powtórzony znak i termin przed wpływem', async () => {
    const user = userEvent.setup()
    renderPage(draft)
    const reference = await screen.findByLabelText('Znak / numer sprawy *')
    await user.type(reference, ' udip/2026/0158 ')
    fireEvent.change(screen.getByLabelText('Termin *'), {
      target: { value: '2026-11-20' },
    })
    fireEvent.change(screen.getByLabelText('Temat sprawy *'), {
      target: { value: '   ' },
    })
    await user.click(
      screen.getByRole('button', {
        name: 'Utwórz sprawę i przejdź do analizy',
      }),
    )
    expect(
      await screen.findByText('Sprawa o takim znaku już istnieje.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Termin nie może być wcześniejszy niż data wpływu.'),
    ).toBeInTheDocument()
    expect(screen.getByText('To pole jest wymagane.')).toBeInTheDocument()
    expect(screen.queryByTestId('snapshot')).not.toBeInTheDocument()
  })

  it('odrzuca brak daty wpływu i terminu', async () => {
    const user = userEvent.setup()
    renderPage(draft)
    await screen.findByText('wniosek.pdf')
    fireEvent.change(screen.getByLabelText('Data wpływu *'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Termin *'), {
      target: { value: '' },
    })
    await user.click(
      screen.getByRole('button', {
        name: 'Utwórz sprawę i przejdź do analizy',
      }),
    )
    await waitFor(() =>
      expect(
        screen.getAllByText('To pole jest wymagane.').length,
      ).toBeGreaterThanOrEqual(3),
    )
    expect(screen.getByText(/Podaj prawidłową datę wpływu/)).toBeInTheDocument()
  })
})
