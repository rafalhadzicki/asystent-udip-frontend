import type { CaseItem, KnowledgeItem } from './types'

export const DEMO_TODAY = '2026-11-21'

export const createDemoCases = (): CaseItem[] =>
  Array.from({ length: 10 }, (_, index) => {
    const receivedDay = 5 + index
    const deadlineDay = 19 + index
    return {
      id: `demo-${index + 1}`,
      reference: `UDIP/2026/${String(158 + index).padStart(4, '0')}`,
      subject:
        index === 0
          ? 'Remont ul. Gdańskiej — kosztorys, umowa i protokoły odbioru'
          : [
              'Koszty utrzymania zieleni miejskiej',
              'Wyniki konsultacji społecznych',
              'Harmonogram remontów dróg',
              'Wydatki na promocję miasta',
              'Umowy dotyczące transportu publicznego',
              'Pomiary hałasu',
              'Budowa przystanku tramwajowego',
              'Zezwolenia na wycinkę drzew',
              'Koszty oświetlenia ulic',
            ][index - 1],
      applicant:
        index === 0
          ? 'Jan Demonstracyjny'
          : `Wnioskodawca testowy ${index + 1}`,
      receivedAt: `2026-11-${receivedDay.toString().padStart(2, '0')}`,
      writtenAt: `2026-11-${(receivedDay - 1).toString().padStart(2, '0')}`,
      deadline: `2026-11-${deadlineDay}`,
      owner: 'Urzędnik demonstracyjny',
      status:
        index === 9 ? 'completed' : index % 3 === 1 ? 'waiting' : 'analysis',
      requestText:
        'Proszę o udostępnienie kosztorysu inwestorskiego, umowy z wykonawcą oraz protokołów odbioru remontu ul. Gdańskiej.',
      source: {
        id: `source-${index}`,
        name: 'Wniosek_demonstracyjny.pdf',
        size: 128000,
        unit: '',
        addedAt: `2026-11-${receivedDay.toString().padStart(2, '0')}`,
      },
      questions: [
        { id: 'cost', text: 'Kosztorys inwestorski', selected: true },
        { id: 'contract', text: 'Umowa z wykonawcą', selected: true },
        { id: 'protocols', text: 'Protokoły odbioru', selected: true },
      ],
      departments: [
        {
          id: 'roads',
          name: 'ZDMiKP',
          reason:
            'Dokumentacja inwestycji drogowych — sugestia demonstracyjna.',
          selected: true,
        },
        {
          id: 'investment',
          name: 'Wydział Inwestycji Miasta',
          reason: 'Materiały dotyczące umowy — sugestia demonstracyjna.',
          selected: false,
        },
      ],
      materials: [],
      materialNotes: '',
      contactedAt: '',
      responseText: '',
      redactions: [],
      redactionConfirmed: false,
      sentAt: index === 9 ? '2026-11-20' : '',
      sentNote: '',
    }
  })

export const createDemoKnowledge = (): KnowledgeItem[] => [
  {
    id: 'udip',
    name: 'Ustawa o dostępie do informacji publicznej',
    category: 'law',
    description:
      'Pozycja demonstracyjna. Aktualny tekst prawny wymaga wgrania i weryfikacji.',
    updatedAt: DEMO_TODAY,
    fileName: 'udip_demo.pdf',
  },
  {
    id: 'answer',
    name: 'Archiwalna odpowiedź — inwestycje drogowe',
    category: 'response',
    description:
      'Przykładowy materiał referencyjny, nie rozstrzygnięcie nowej sprawy.',
    updatedAt: DEMO_TODAY,
    fileName: 'odpowiedz_demo.docx',
  },
  {
    id: 'privacy',
    name: 'Lista kontrolna anonimizacji',
    category: 'guideline',
    description:
      'Materiał demonstracyjny. Każdy fragment wymaga decyzji człowieka.',
    updatedAt: DEMO_TODAY,
    fileName: 'lista_demo.txt',
  },
]
