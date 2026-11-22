import { afterEach, describe, expect, it, vi } from 'vitest'
import { ZodError } from 'zod'
import { apiClient, UPLOAD_TIMEOUT_MS } from '../client'
import {
  analyzeRequest,
  createCase,
  draftResponse,
  getAllCases,
  getCases,
  getRedactionSuggestions,
  setCaseDepartments,
  setCaseQuestions,
  uploadCaseDocument,
} from './cases.api'

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
  questions: [],
  documents: [],
  statusHistory: [],
  allowedStatuses: ['SENT_TO_DEPARTMENTS'],
  maxExtendedDueAt: '2027-01-20',
}

describe('cases api', () => {
  afterEach(() => vi.restoreAllMocks())

  it('analyzeRequest wysyła plik jako multipart z sygnałem anulowania i dłuższym limitem czasu', async () => {
    const response = {
      fileName: 'test.pdf',
      textExtractionStatus: 'NO_TEXT',
      extractedText: null,
      suggestions: { caseNumber: null, receivedAt: null, subject: null },
      questions: [],
      departments: [],
      ai: { status: 'NOT_CONFIGURED' },
      warnings: ['TEXT_NOT_FOUND'],
    }
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue(response)
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
    const signal = new AbortController().signal
    await expect(analyzeRequest(file, signal)).resolves.toEqual(response)
    const [url, body, config] = post.mock.calls[0]
    expect(url).toBe('/api/cases/analyze')
    expect((body as FormData).get('file')).toBe(file)
    expect(config).toEqual({ signal, timeout: UPLOAD_TIMEOUT_MS })
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

  it('getAllCases walks through every page with the signal', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ items: [summary, summary], total: 3 })
      .mockResolvedValueOnce({ items: [summary], total: 3 })
    const signal = new AbortController().signal
    const items = await getAllCases({ year: 2026 }, signal)
    expect(items).toHaveLength(3)
    expect(get).toHaveBeenCalledTimes(2)
    expect(get.mock.calls[1][1]).toMatchObject({
      signal,
      params: { year: 2026, limit: 500, offset: 2 },
    })
  })

  it('getAllCases fails instead of returning a truncated export', async () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      items: [summary],
      total: 1_000_000,
    })
    await expect(getAllCases({ year: 2026 })).rejects.toThrow('Too many cases')
  })

  it('PUT pytań i jednostek wysyła listy pod adresami sprawy', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue(detail)
    await setCaseQuestions({
      id: 'case-1',
      questions: [{ text: 'Pytanie?', departmentId: 'dep-1' }],
    })
    await setCaseDepartments({ id: 'case-1', departmentIds: ['dep-1'] })
    expect(put.mock.calls[0]).toEqual([
      '/api/cases/case-1/questions',
      { questions: [{ text: 'Pytanie?', departmentId: 'dep-1' }] },
    ])
    expect(put.mock.calls[1]).toEqual([
      '/api/cases/case-1/departments',
      { departmentIds: ['dep-1'] },
    ])
  })

  it('uploadCaseDocument wysyła plik, rodzaj i jednostkę jako multipart', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      id: 'doc-1',
      kind: 'DEPARTMENT_RESPONSE',
      department: null,
      originalName: 'odp.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 4,
      textExtractionStatus: 'EXTRACTED',
      uploadedBy: { id: 'user-1', email: 'user@example.test' },
      createdAt: '2026-11-20T10:00:00.000Z',
    })
    const file = new File(['test'], 'odp.pdf', { type: 'application/pdf' })
    await uploadCaseDocument({
      caseId: 'case-1',
      file,
      kind: 'DEPARTMENT_RESPONSE',
      departmentId: 'dep-1',
    })
    const [url, body] = post.mock.calls[0]
    expect(url).toBe('/api/cases/case-1/documents')
    const form = body as FormData
    expect(form.get('file')).toBe(file)
    expect(form.get('kind')).toBe('DEPARTMENT_RESPONSE')
    expect(form.get('departmentId')).toBe('dep-1')
  })

  it('draftResponse i redaction-suggestions parsują odpowiedzi AI', async () => {
    const post = vi.spyOn(apiClient, 'post')
    post.mockResolvedValueOnce({
      text: 'Szkic [UZUPEŁNIJ: data]',
      sources: [
        {
          kind: 'KNOWLEDGE',
          documentId: 'k-1',
          documentName: 'Ustawa',
          category: 'LAW',
          excerpt: 'Art. 1',
        },
      ],
    })
    await expect(
      draftResponse({ id: 'case-1', notes: 'notatka' }),
    ).resolves.toMatchObject({ sources: [{ documentName: 'Ustawa' }] })
    expect(post.mock.calls[0]).toEqual([
      '/api/cases/case-1/draft-response',
      { notes: 'notatka' },
    ])
    post.mockResolvedValueOnce({
      suggestions: [
        {
          text: 'Jan Kowalski',
          category: 'PERSON_NAME',
          reason: 'Dane osobowe',
        },
      ],
    })
    await expect(
      getRedactionSuggestions({ id: 'case-1', text: 'Jan Kowalski' }),
    ).resolves.toEqual({
      suggestions: [
        {
          text: 'Jan Kowalski',
          category: 'PERSON_NAME',
          reason: 'Dane osobowe',
        },
      ],
    })
  })
})
