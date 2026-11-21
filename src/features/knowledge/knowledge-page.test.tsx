import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoCases, createDemoKnowledge } from '@/features/demo/demo-data'
import { DEMO_STORAGE_KEY, DemoProvider } from '@/features/demo/demo-store'
import type { KnowledgeItem } from '@/features/demo/types'
import { KnowledgePage, MAX_KNOWLEDGE_FILE_BYTES } from './knowledge-page'

const renderPage = () =>
  render(
    <DemoProvider>
      <KnowledgePage />
    </DemoProvider>,
  )

const storedKnowledge = (): KnowledgeItem[] => {
  const raw = localStorage.getItem(DEMO_STORAGE_KEY)
  if (!raw) throw new Error('Missing demo snapshot')
  const parsed: { knowledge: KnowledgeItem[] } = JSON.parse(raw)
  return parsed.knowledge
}

const seedKnowledge = (knowledge: KnowledgeItem[]) =>
  localStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify({ version: 1, cases: createDemoCases(), knowledge }),
  )

const tableRows = () =>
  within(screen.getByRole('table')).getAllByRole('row').slice(1)

describe('KnowledgePage', () => {
  beforeEach(() => localStorage.clear())

  it('filtruje listę wyszukiwaniem i kategorią oraz pokazuje pusty stan', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(tableRows()).toHaveLength(3)

    await user.type(
      screen.getByRole('searchbox', { name: 'Szukaj w bazie wiedzy' }),
      'anonimizacji',
    )
    expect(tableRows()).toHaveLength(1)
    expect(screen.getByText('Lista kontrolna anonimizacji')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Akt prawny (0)' }))
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(
      screen.getByText('Brak dokumentów spełniających kryteria wyszukiwania.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Wyczyść filtry' }))
    expect(tableRows()).toHaveLength(3)
    await user.click(
      screen.getByRole('button', { name: 'Wzór odpowiedzi (1)' }),
    )
    expect(tableRows()).toHaveLength(1)
    expect(
      screen.getByText('Archiwalna odpowiedź — inwestycje drogowe'),
    ).toBeInTheDocument()
  })

  it('stronicuje wyniki', async () => {
    const user = userEvent.setup()
    seedKnowledge(
      Array.from({ length: 7 }, (_, index) => ({
        ...createDemoKnowledge()[0],
        id: `seed-${index}`,
        name: `Dokument demonstracyjny ${index + 1}`,
      })),
    )
    renderPage()
    expect(tableRows()).toHaveLength(5)
    expect(screen.getByText('1–5 z 7')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Następna strona' }))
    expect(tableRows()).toHaveLength(2)
    expect(screen.getByText('6–7 z 7')).toBeInTheDocument()
  })

  it('waliduje formularz dodawania i zapisuje tylko metadane pliku', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderPage()
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
      within(dialog).getByText('Podaj opis dokumentu.'),
    ).toBeInTheDocument()
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

    await user.upload(fileInput, new File(['treść'], 'wytyczne.docx'))
    await user.type(
      within(dialog).getByLabelText(/Nazwa dokumentu/),
      'Nowe wytyczne  ',
    )
    await user.selectOptions(
      within(dialog).getByLabelText(/Kategoria/),
      'guideline',
    )
    await user.type(
      within(dialog).getByLabelText(/Opis zakresu/),
      '  Opis testowy ',
    )
    await user.click(
      within(dialog).getByRole('button', { name: 'Dodaj dokument' }),
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Dodano dokument „Nowe wytyczne”.',
    )
    const added = storedKnowledge().find(
      (item) => item.name === 'Nowe wytyczne',
    )
    expect(added).toMatchObject({
      category: 'guideline',
      description: 'Opis testowy',
      fileName: 'wytyczne.docx',
      updatedAt: '2026-11-21',
    })
    expect(Object.keys(added ?? {}).sort()).toEqual([
      'category',
      'description',
      'fileName',
      'id',
      'name',
      'updatedAt',
    ])

    await user.click(
      screen.getByRole('button', { name: 'Podgląd: Nowe wytyczne' }),
    )
    const preview = screen.getByRole('dialog', { name: 'Podgląd dokumentu' })
    expect(within(preview).getByText('wytyczne.docx')).toBeInTheDocument()
    expect(within(preview).getByText('Opis testowy')).toBeInTheDocument()
    expect(
      within(preview).getByText(/Treść pliku nie jest przechowywana/),
    ).toBeInTheDocument()
  })

  it('aktualizuje wpis z zachowaniem identyfikatora i opcjonalną wymianą pliku', async () => {
    const user = userEvent.setup()
    seedKnowledge(
      createDemoKnowledge().map((item) => ({
        ...item,
        updatedAt: '2026-01-10',
      })),
    )
    renderPage()
    await user.click(
      screen.getByRole('button', {
        name: 'Aktualizuj: Lista kontrolna anonimizacji',
      }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Aktualizuj dokument' })
    expect(
      within(dialog).getByText('Obecny plik: lista_demo.txt'),
    ).toBeInTheDocument()

    const name = within(dialog).getByLabelText(/Nazwa dokumentu/)
    await user.clear(name)
    await user.click(
      within(dialog).getByRole('button', { name: 'Zapisz zmiany' }),
    )
    expect(
      within(dialog).getByText('Podaj nazwę dokumentu.'),
    ).toBeInTheDocument()

    await user.type(name, 'Lista kontrolna v2')
    await user.click(
      within(dialog).getByRole('button', { name: 'Zapisz zmiany' }),
    )
    let updated = storedKnowledge().find((item) => item.id === 'privacy')
    expect(updated).toMatchObject({
      name: 'Lista kontrolna v2',
      fileName: 'lista_demo.txt',
      updatedAt: '2026-11-21',
    })
    expect(storedKnowledge()).toHaveLength(3)

    await user.click(
      screen.getByRole('button', { name: 'Aktualizuj: Lista kontrolna v2' }),
    )
    const second = screen.getByRole('dialog', { name: 'Aktualizuj dokument' })
    await user.upload(
      within(second).getByLabelText(/^Plik/),
      new File(['nowa'], 'lista_v2.pdf'),
    )
    await user.click(
      within(second).getByRole('button', { name: 'Zapisz zmiany' }),
    )
    updated = storedKnowledge().find((item) => item.id === 'privacy')
    expect(updated?.fileName).toBe('lista_v2.pdf')
  })
})
