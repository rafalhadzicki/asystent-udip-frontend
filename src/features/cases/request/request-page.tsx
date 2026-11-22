import {
  Layout,
  Section,
  SectionHeader,
  SectionTitle,
  SourceIcon,
  Details,
  Detail,
  Term,
  Description,
  RequestText,
  FieldGrid,
  Actions,
} from './request-page.styles'
import { useEffect, useState } from 'react'
import { Alert, Button } from '@mui/material'
import { ArrowRight, Download, FileText, Pencil } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useOutletContext } from 'react-router-dom'
import { FormTextField } from '@/components/form/form-text-field'
import { displayDate, validIsoDate } from '@/features/cases/date-utils'
import type { CaseNumberConflict } from '@/api/cases/cases.schemas'
import {
  useDownloadCaseDocument,
  useGetDeadlinePreview,
} from '@/api/cases/cases.queries'
import { downloadBlob } from '@/features/cases/download-blob'
import { getApiErrorKind } from '@/api/errors'
import { isFutureDate } from '../verification/verification-utils'
import {
  getCaseNumberConflict,
  useCaseNumberConflict,
} from '../use-case-number-check'
import { useSaveCase } from '../use-save-case'
import type { CaseItem } from '@/features/cases/types'
import { caseTabs, routes } from '@/app/routes'

type RequestValues = Pick<
  CaseItem,
  | 'reference'
  | 'subject'
  | 'applicant'
  | 'receivedAt'
  | 'writtenAt'
  | 'deadline'
  | 'requestText'
>
type Notice = 'saved' | 'scopeReset' | 'applicantChanged' | 'saveFailed'

const toValues = (item: CaseItem): RequestValues => ({
  reference: item.reference,
  subject: item.subject,
  applicant: item.applicant,
  receivedAt: item.receivedAt,
  writtenAt: item.writtenAt,
  deadline: item.deadline,
  requestText: item.requestText,
})

const isDate = validIsoDate

const SourceSection = ({ item }: { item: CaseItem }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'request' })
  const size = new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 0,
  }).format(item.source.size / 1024)
  const {
    downloadCaseDocumentAsync,
    isDownloadingCaseDocument,
    isDownloadCaseDocumentError,
  } = useDownloadCaseDocument()
  // Cases without an uploaded request file have no original to download.
  const hasFile = item.source.name !== ''
  const downloadOriginal = async () => {
    const blob = await downloadCaseDocumentAsync({
      caseId: item.id,
      documentId: item.source.id,
    }).catch(() => null)
    if (blob) downloadBlob(blob, item.source.name)
  }
  return (
    <Section aria-labelledby="request-source-title">
      <SourceIcon>
        <FileText aria-hidden="true" />
      </SourceIcon>
      <SectionTitle id="request-source-title" variant="h2">
        {t('source.title')}
      </SectionTitle>
      <Details>
        <Detail wide>
          <Term>{t('source.name')}</Term>
          <Description>{item.source.name}</Description>
        </Detail>
        <Detail>
          <Term>{t('source.size')}</Term>
          <Description>{t('source.sizeValue', { value: size })}</Description>
        </Detail>
        <Detail>
          <Term>{t('source.addedAt')}</Term>
          <Description>{displayDate(item.source.addedAt)}</Description>
        </Detail>
        <Detail wide>
          <Term>{t('source.unit')}</Term>
          <Description>{item.source.unit || t('details.empty')}</Description>
        </Detail>
      </Details>
      {hasFile && (
        <Button
          variant="outlined"
          startIcon={<Download aria-hidden="true" size={16} />}
          loading={isDownloadingCaseDocument}
          onClick={() => void downloadOriginal()}
        >
          {t('source.download')}
        </Button>
      )}
      {isDownloadCaseDocumentError && (
        <Alert severity="error">{t('source.downloadError')}</Alert>
      )}
    </Section>
  )
}

const RequestEditor = ({ item }: { item: CaseItem }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'request' })
  const saveCase = useSaveCase(item)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const readOnly = item.status === 'completed'
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    setError,
    getValues,
    trigger,
  } = useForm<RequestValues>({
    mode: 'onBlur',
    defaultValues: toValues(item),
  })
  const [reference, receivedAt, subject, requestText] = useWatch({
    control,
    name: ['reference', 'receivedAt', 'subject', 'requestText'],
  })

  // The backend checks the number and computes the deadline.
  const checksWithApi = editing
  const conflict = useCaseNumberConflict({
    caseNumber: checksWithApi ? reference : '',
    receivedAt,
    exceptId: item.id,
  })
  const receivedAtChanged = receivedAt !== item.receivedAt
  const { deadlinePreview } = useGetDeadlinePreview(
    checksWithApi &&
      receivedAtChanged &&
      isDate(receivedAt) &&
      !isFutureDate(receivedAt)
      ? receivedAt
      : undefined,
  )
  const apiDeadline = receivedAtChanged ? deadlinePreview?.dueAt : item.deadline
  useEffect(() => {
    if (apiDeadline) setValue('deadline', apiDeadline)
  }, [apiDeadline, setValue])
  useEffect(() => {
    if (checksWithApi && reference.trim()) void trigger('reference')
  }, [checksWithApi, conflict, reference, trigger])
  const conflictMessage = (code: CaseNumberConflict) =>
    code === 'SEQUENCE_NUMBER_TAKEN'
      ? t('errors.sequenceTaken')
      : t('errors.referenceTaken')

  const scopeChanged =
    subject.trim() !== item.subject.trim() ||
    requestText.trim() !== item.requestText.trim()
  const required = (value: string) =>
    value.trim() !== '' || t('errors.required')
  const date = (value: string) => isDate(value) || t('errors.date')

  const onSubmit = async (values: RequestValues) => {
    if (readOnly) return
    const trimmed: RequestValues = {
      reference: values.reference.trim(),
      subject: values.subject.trim(),
      applicant: values.applicant.trim(),
      receivedAt: values.receivedAt,
      writtenAt: values.writtenAt,
      deadline: values.deadline,
      requestText: values.requestText.trim(),
    }
    const applicantChanged = trimmed.applicant !== item.applicant.trim()
    const resetsScope = scopeChanged
    try {
      await saveCase(
        resetsScope
          ? {
              ...trimmed,
              status: 'analysis',
              analysisNeedsReview: true,
              responseText: '',
              redactions: [],
              redactionConfirmed: false,
            }
          : applicantChanged && item.responseText
            ? {
                ...trimmed,
                status: 'waiting',
                redactions: [],
                redactionConfirmed: false,
              }
            : trimmed,
      )
    } catch (error) {
      if (getApiErrorKind(error) === 'conflict')
        setError('reference', {
          message: conflictMessage(
            getCaseNumberConflict(error) ?? 'CASE_NUMBER_TAKEN',
          ),
        })
      else setNotice('saveFailed')
      return
    }
    reset(trimmed)
    setEditing(false)
    setNotice(
      resetsScope
        ? 'scopeReset'
        : applicantChanged && item.responseText
          ? 'applicantChanged'
          : 'saved',
    )
  }

  const cancel = () => {
    reset()
    setEditing(false)
  }

  const startEditing = () => {
    setNotice(null)
    setEditing(true)
  }

  return (
    <Section aria-labelledby="request-details-title">
      <SectionHeader>
        <SectionTitle id="request-details-title" variant="h2">
          {t('details.title')}
        </SectionTitle>
        {!readOnly && !editing && (
          <Button
            variant="outlined"
            startIcon={<Pencil aria-hidden="true" size={16} />}
            onClick={startEditing}
          >
            {t('actions.edit')}
          </Button>
        )}
      </SectionHeader>

      {readOnly && <Alert severity="info">{t('readOnly')}</Alert>}
      {notice && (
        <Alert
          severity={notice === 'saved' ? 'success' : 'warning'}
          role="status"
        >
          {t(`notice.${notice}`)}
        </Alert>
      )}

      {editing ? (
        <form noValidate onSubmit={handleSubmit(onSubmit)}>
          <FieldGrid>
            <FormTextField
              control={control}
              name="reference"
              label={t('details.reference')}
              required
              rules={{
                validate: {
                  required,
                  unique: () => !conflict || conflictMessage(conflict),
                },
              }}
            />
            <FormTextField
              control={control}
              name="applicant"
              label={t('details.applicant')}
              required
              rules={{ validate: { required } }}
            />
            <FormTextField
              className="wide"
              control={control}
              name="subject"
              label={t('details.subject')}
              required
              multiline
              minRows={2}
              rules={{ validate: { required } }}
            />
            <FormTextField
              control={control}
              name="receivedAt"
              label={t('details.receivedAt')}
              type="date"
              required
              slotProps={{ inputLabel: { shrink: true } }}
              rules={{ validate: { date }, deps: ['writtenAt', 'deadline'] }}
            />
            <FormTextField
              control={control}
              name="writtenAt"
              label={t('details.writtenAt')}
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
              rules={{
                validate: {
                  date: (value) => !value || date(value),
                  order: (value) =>
                    !value ||
                    !isDate(getValues('receivedAt')) ||
                    value <= getValues('receivedAt') ||
                    t('errors.writtenAfterReceived'),
                },
              }}
            />
            <FormTextField
              control={control}
              name="deadline"
              label={t('details.deadline')}
              type="date"
              required
              disabled
              slotProps={{ inputLabel: { shrink: true } }}
              helperText={t('deadlineFromServer')}
            />
            <FormTextField
              className="wide"
              control={control}
              name="requestText"
              label={t('details.requestText')}
              required
              multiline
              minRows={6}
              rules={{ validate: { required } }}
            />
            {scopeChanged && (
              <Alert className="wide" severity="warning">
                {t('scopeWarning')}
              </Alert>
            )}
            <Actions className="wide">
              <Button variant="text" onClick={cancel}>
                {t('actions.cancel')}
              </Button>
              <Button type="submit" variant="contained">
                {t('actions.save')}
              </Button>
            </Actions>
          </FieldGrid>
        </form>
      ) : (
        <Details>
          <Detail>
            <Term>{t('details.reference')}</Term>
            <Description>{item.reference}</Description>
          </Detail>
          <Detail>
            <Term>{t('details.applicant')}</Term>
            <Description>{item.applicant}</Description>
          </Detail>
          <Detail wide>
            <Term>{t('details.subject')}</Term>
            <Description>{item.subject}</Description>
          </Detail>
          <Detail>
            <Term>{t('details.receivedAt')}</Term>
            <Description>{displayDate(item.receivedAt)}</Description>
          </Detail>
          <Detail>
            <Term>{t('details.writtenAt')}</Term>
            <Description>{displayDate(item.writtenAt)}</Description>
          </Detail>
          <Detail>
            <Term>{t('details.deadline')}</Term>
            <Description>{displayDate(item.deadline)}</Description>
          </Detail>
          <Detail wide>
            <Term>{t('details.requestText')}</Term>
            <RequestText>{item.requestText}</RequestText>
          </Detail>
        </Details>
      )}

      {!editing && (
        <Actions>
          <Button
            component={Link}
            to={routes.caseTab(item.id, caseTabs.analysis)}
            variant="contained"
            endIcon={<ArrowRight aria-hidden="true" size={16} />}
          >
            {t('actions.next')}
          </Button>
        </Actions>
      )}
    </Section>
  )
}

export const RequestPage = () => {
  const item = useOutletContext<CaseItem>()
  return (
    <Layout>
      <SourceSection item={item} />
      <RequestEditor key={item.id} item={item} />
    </Layout>
  )
}
