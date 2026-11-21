import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { apiClient } from '../client'
import { analyzeRequest, createCase, getCases } from './cases.api'

const summary = {
  id: 'case-1',
  year: 2026,
  sequenceNumber: 1,
  caseNumber: 'TEST.1.2026',
  subject: 'Temat',
  status: 'NEW',
  receivedAt: '2026-11-20',
  dueAt: '2026-12-04',
  extendedDueAt: null,
  isExtended: false,
  effectiveDueAt: '2026-12-04',
  daysLeft: 3,
  urgency: 'UPCOMING',
  respondedAt: null,
  handlerInitials: null,
  assignee: null,
  departments: [],
}

const detail = {
  ...summary,
  createdBy: { id: 'user-1', email: 'user@example.test' },
  createdAt: '2026-11-20T10:00:00.000Z',
  updatedAt: '2026-11-20T10:00:00.000Z',
  departmentRequests: [],
  documents: [],
  statusHistory: [],
  allowedStatuses: ['SENT_TO_DEPARTMENTS'],
  maxExtendedDueAt: '2027-01-20',
}

describe('cases api', () => {
  afterEach(() => vi.restoreAllMocks())

  it('analyzeRequest wysyła plik jako multipart z sygnałem anulowania', async () => {
    const response = {
      fileName: 'test.pdf',
      textExtractionStatus: 'NO_TEXT',
      extractedText: null,
      suggestions: { caseNumber: null, receivedAt: null, subject: null },
      warnings: ['TEXT_NOT_FOUND'],
    }
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(response)
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    const signal = new AbortController().signal
    await expect(analyzeRequest(file, signal)).resolves.toEqual(response)
    const [url, body, config] = post.mock.calls[0]
    expect(url).toBe('/api/cases/analyze')
    expect((body as FormData).get('file')).toBe(file)
    expect(config).toEqual({ signal })
  })

  it.each([
    {},
    {
      fileName: 'x',
      textExtractionStatus: 'UNKNOWN',
      suggestions: {},
      warnings: [],
    },
    {
      fileName: 'x',
      textExtractionStatus: 'EXTRACTED',
      suggestions: {},
      warnings: ['NEW'],
    },
    {
      fileName: 'x',
      textExtractionStatus: 'EXTRACTED',
      suggestions: { receivedAt: { value: 'not-a-date', source: 'TEXT' } },
      warnings: [],
    },
  ])(
    'analyzeRequest odrzuca odpowiedź niezgodną z kontraktem',
    async (response) => {
      vi.spyOn(apiClient, 'post').mockResolvedValue(response)
      await expect(
        analyzeRequest(new File(['x'], 'x.pdf')),
      ).rejects.toBeInstanceOf(ZodError)
    },
  )

  it('getCases łączy statusy przecinkiem i waliduje listę', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ items: [summary], total: 1 })
    await expect(
      getCases({ year: 2026, status: ['NEW', 'RESPONSE_SENT'], limit: 20 }),
    ).resolves.toEqual({ items: [summary], total: 1 })
    expect(get.mock.calls[0][1]?.params).toEqual({
      year: 2026,
      limit: 20,
      status: 'NEW,RESPONSE_SENT',
    })
  })

  it('createCase wysyła JSON bez pliku i multipart z plikiem', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(detail)
    const fields = { subject: 'Temat', receivedAt: '2026-11-20' }
    await createCase(fields)
    expect(post.mock.calls[0][1]).toEqual(fields)
    const file = new File(['x'], 'wniosek.pdf')
    await createCase({ ...fields, file })
    const form = post.mock.calls[1][1] as FormData
    expect(form.get('subject')).toBe('Temat')
    expect(form.get('file')).toBe(file)
  })
})
