import type { CaseItem } from '@/features/demo/types'

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
      apiStatus: index === 9 ? 'RESPONSE_SENT' : 'NEW',
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
      responseText: '',
      redactions: [],
      redactionConfirmed: false,
      sentAt: index === 9 ? '2026-11-20' : '',
      sentNote: '',
    }
  })
