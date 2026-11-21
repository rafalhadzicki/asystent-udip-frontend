import { describe, expect, it } from 'vitest'
import { detail } from '@/test/case-detail'
import { composeApiCase } from './case-from-api'

describe('composeApiCase', () => {
  it('maps server fields and derives local defaults from the API detail', () => {
    expect(composeApiCase(detail)).toMatchObject({
      id: 'case-1',
      reference: 'BKS.IV.1431.1.2026',
      subject: 'Umowy na obsługę prawną',
      applicant: 'Jan Testowy',
      receivedAt: '2026-10-22',
      deadline: '2026-11-05',
      owner: 'MZ',
      status: 'waiting',
      apiStatus: 'SENT_TO_DEPARTMENTS',
      requestText: 'Treść wniosku',
      materialNotes: 'Notatka',
      source: { id: 'doc-1', name: 'wniosek.pdf', size: 2048 },
      departments: [{ id: 'dept-1', name: 'Wydział testowy', selected: true }],
      materials: [{ id: 'doc-2', name: 'odpowiedz.docx', unit: 'WT' }],
      questions: [],
      responseText: '',
    })
  })

  it('uses the deadline in force and tolerates missing optional data', () => {
    expect(
      composeApiCase({
        ...detail,
        effectiveDueAt: '2026-12-11',
        requestText: null,
        requesterName: null,
        notes: null,
        documents: [],
        status: 'RESPONSE_SENT',
        respondedAt: '2026-11-20',
      }),
    ).toMatchObject({
      deadline: '2026-12-11',
      requestText: '',
      applicant: '',
      status: 'completed',
      sentAt: '2026-11-20',
      source: { name: '', size: 0 },
    })
  })

  it('takes the writing date from the API, not from the local overlay', () => {
    const withDate = { ...detail, writtenAt: '2026-01-10' }
    expect(
      composeApiCase(withDate, { writtenAt: '1999-01-01' }).writtenAt,
    ).toBe('2026-01-10')
    expect(composeApiCase({ ...detail, writtenAt: null }, {}).writtenAt).toBe(
      '',
    )
  })

  it('layers local data over the defaults but never over server fields', () => {
    const item = composeApiCase(detail, {
      status: 'redaction',
      responseText: 'Moja odpowiedź',
      questions: [{ id: 'q', text: 'Pytanie', selected: true }],
    })
    expect(item).toMatchObject({
      status: 'redaction',
      responseText: 'Moja odpowiedź',
      questions: [{ id: 'q' }],
      subject: detail.subject,
      apiStatus: 'SENT_TO_DEPARTMENTS',
    })
  })

  it('keeps the local stage when the backend stage changes', () => {
    const item = composeApiCase(
      { ...detail, status: 'RESPONSE_PREPARED' },
      { status: 'redaction' },
    )
    expect(item.status).toBe('redaction')
    expect(item.apiStatus).toBe('RESPONSE_PREPARED')
  })

  it('takes the backend stage when it is ahead of the local one', () => {
    const item = composeApiCase(
      { ...detail, status: 'RESPONSE_SENT' },
      { status: 'waiting' },
    )
    expect(item.status).toBe('completed')
  })
})
