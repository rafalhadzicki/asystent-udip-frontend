import type { CaseDetail, CaseStatus } from '@/api/cases/cases.schemas'
import type { CaseOverlay } from '@/features/demo/demo-schema'
import type {
  CaseItem,
  CaseStatus as LocalStatus,
  DocumentMeta,
} from '@/features/demo/types'

// Stage of the local workflow that corresponds to the backend status.
const localStatus: Record<CaseStatus, LocalStatus> = {
  NEW: 'analysis',
  SENT_TO_DEPARTMENTS: 'waiting',
  RESPONSE_PREPARED: 'draft',
  RESPONSE_SENT: 'completed',
}

// Order of the local workflow; a local stage never lags behind the server.
const stageOrder: Record<LocalStatus, number> = {
  analysis: 0,
  waiting: 1,
  draft: 2,
  redaction: 2,
  completed: 3,
}

// The server stage wins when it is ahead of the stage kept locally (e.g. changed
// elsewhere); local progress is kept while it is ahead of or equal to the server.
const resolveStatus = (
  detail: CaseDetail,
  overlay: CaseOverlay,
): LocalStatus => {
  const fromServer = localStatus[detail.status]
  return overlay.status && stageOrder[overlay.status] >= stageOrder[fromServer]
    ? overlay.status
    : fromServer
}

type ApiDocument = CaseDetail['documents'][number]

const documentMeta = (document: ApiDocument): DocumentMeta => ({
  id: document.id,
  name: document.originalName,
  size: document.sizeBytes,
  unit: document.department?.symbol ?? '',
  addedAt: document.createdAt.slice(0, 10),
})

// Starting point of the local workflow, used until the user changes something.
const localDefaults = (detail: CaseDetail) => ({
  writtenAt: '',
  status: localStatus[detail.status],
  questions: [],
  departments: detail.departmentRequests.map(({ department }) => ({
    id: department.id,
    name: department.name,
    reason: '',
    selected: true,
  })),
  materials: detail.documents
    .filter(({ kind }) => kind !== 'REQUEST')
    .map(documentMeta),
  materialNotes: detail.notes ?? '',
  contactedAt: '',
  responseText: '',
  redactions: [],
  redactionConfirmed: false,
  sentAt: detail.respondedAt ?? '',
  sentNote: '',
})

// The backend owns identification, dates, the request itself and the stage;
// the local overlay only adds what the API cannot store yet.
export const composeApiCase = (
  detail: CaseDetail,
  overlay: CaseOverlay = {},
): CaseItem => {
  const request = detail.documents.find(({ kind }) => kind === 'REQUEST')
  return {
    ...localDefaults(detail),
    ...overlay,
    status: resolveStatus(detail, overlay),
    id: detail.id,
    reference: detail.caseNumber,
    subject: detail.subject,
    applicant: detail.requesterName ?? '',
    receivedAt: detail.receivedAt,
    deadline: detail.effectiveDueAt,
    owner: detail.assignee?.email ?? detail.handlerInitials ?? '',
    requestText: detail.requestText ?? '',
    apiStatus: detail.status,
    source: request
      ? documentMeta(request)
      : {
          id: detail.id,
          name: '',
          size: 0,
          unit: '',
          addedAt: detail.receivedAt,
        },
  }
}
