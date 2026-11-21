import {
  Page,
  Columns,
  Card,
  Fields,
  FullWidth,
  SourceText,
  Actions,
} from './verification-page.styles'
import { Alert, Button, Typography } from '@mui/material'
import { format, parseISO } from 'date-fns'
import { useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { FormTextField } from '@/components/form/form-text-field'
import { useDemoStore } from '@/features/demo/demo-store'
import type { CaseItem, UploadDraft } from '@/features/demo/types'
import { DEMO_TODAY } from '@/features/demo/demo-data'
import { validIsoDate } from '@/features/demo/date-utils'
import { normalizeReference, suggestedDeadline } from '../case-utils'
import { caseTabs, routes } from '@/app/routes'

type VerificationValues = {
  applicant: string
  reference: string
  subject: string
  writtenAt: string
  receivedAt: string
  deadline: string
  requestText: string
}

const validDate = validIsoDate

export const VerificationPage = () => {
  const { uploadDraft } = useDemoStore()
  const { t } = useTranslation('translation', { keyPrefix: 'verification' })
  if (!uploadDraft) {
    return (
      <Page>
        <Typography variant="h1">{t('missingTitle')}</Typography>
        <Typography color="text.secondary" sx={{ my: 2 }}>
          {t('missingDescription')}
        </Typography>
        <Button component={Link} to={routes.upload} variant="contained">
          {t('backToUpload')}
        </Button>
      </Page>
    )
  }
  return <VerificationForm draft={uploadDraft} />
}

const VerificationForm = ({ draft }: { draft: UploadDraft }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'verification' })
  const { cases, addCase, setUploadDraft } = useDemoStore()
  const navigate = useNavigate()
  const submitted = useRef(false)
  const { control, handleSubmit, setValue, trigger } =
    useForm<VerificationValues>({
      defaultValues: {
        applicant: draft.applicant,
        reference: '',
        subject: draft.subject,
        writtenAt: draft.writtenAt,
        receivedAt: draft.receivedAt,
        deadline: suggestedDeadline(draft.receivedAt),
        requestText: draft.requestText,
      },
    })
  const receivedAt = useWatch({ control, name: 'receivedAt' })
  const suggestion = suggestedDeadline(receivedAt)
  const required = (value: string) => value.trim().length > 0 || t('required')
  const dateRequired = (value: string) =>
    (required(value) === true && validDate(value)) ||
    (value.trim() ? t('invalidDate') : t('required'))
  const onSubmit = (values: VerificationValues) => {
    if (submitted.current) return
    submitted.current = true
    const id = crypto.randomUUID()
    const requestText = values.requestText.trim()
    const item: CaseItem = {
      id,
      reference: values.reference.trim(),
      applicant: values.applicant.trim(),
      subject: values.subject.trim(),
      writtenAt: values.writtenAt.trim(),
      receivedAt: values.receivedAt.trim(),
      deadline: values.deadline.trim(),
      owner: 'Urzędnik demonstracyjny',
      status: 'analysis',
      requestText,
      source: {
        id: crypto.randomUUID(),
        name: draft.file.name,
        size: draft.file.size,
        unit: '',
        addedAt: DEMO_TODAY,
      },
      questions: requestText
        .split(/\n+|(?<=[.!?])\s+/u)
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({ id: crypto.randomUUID(), text, selected: false })),
      departments: [
        {
          id: crypto.randomUUID(),
          name: t('departmentName'),
          reason: t('departmentReason'),
          selected: false,
        },
      ],
      materials: [],
      materialNotes: '',
      contactedAt: '',
      responseText: '',
      redactions: [],
      redactionConfirmed: false,
      sentAt: '',
      sentNote: '',
    }
    addCase(item)
    setUploadDraft(null)
    navigate(routes.caseTab(id, caseTabs.analysis))
  }

  return (
    <Page>
      <Typography variant="overline" color="primary">
        {t('step')}
      </Typography>
      <Alert severity="info" sx={{ mt: 1 }}>
        {t('ocrNotice')}
      </Alert>
      <Columns>
        <Card as="section" aria-labelledby="source-title">
          <Typography
            id="source-title"
            variant="h2"
            sx={{ fontSize: '1.2rem', fontWeight: 600 }}
          >
            {t('sourceTitle')}
          </Typography>
          <Typography sx={{ mt: 2, overflowWrap: 'anywhere' }}>
            {draft.file.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('sourceSize', { size: draft.file.size })}
          </Typography>
          <Alert severity="warning" sx={{ my: 2 }}>
            {t('sourceNotice')}
          </Alert>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
            {t('extractedTitle')}
          </Typography>
          <SourceText>{draft.requestText || t('emptyText')}</SourceText>
        </Card>
        <Card as="section" aria-labelledby="verification-title">
          <Typography id="verification-title" variant="h1">
            {t('title')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t('description')}
          </Typography>
          <form
            noValidate
            onSubmit={(event) => {
              void handleSubmit(onSubmit)(event)
            }}
          >
            <Fields>
              <FormTextField
                control={control}
                name="reference"
                label={t('reference')}
                required
                rules={{
                  validate: (value) =>
                    (required(value) === true &&
                      (!cases.some(
                        (item) =>
                          normalizeReference(item.reference) ===
                          normalizeReference(value),
                      ) ||
                        t('duplicateReference'))) ||
                    required(value),
                }}
              />
              <FormTextField
                control={control}
                name="applicant"
                label={t('applicant')}
                required
                rules={{ validate: required }}
              />
              <FormTextField
                control={control}
                name="writtenAt"
                label={t('writtenAt')}
                type="date"
                helperText={t('dateOptional')}
                slotProps={{ inputLabel: { shrink: true } }}
                rules={{
                  validate: (value) =>
                    !value.trim() ||
                    validDate(value.trim()) ||
                    t('invalidDate'),
                }}
              />
              <FormTextField
                control={control}
                name="receivedAt"
                label={t('receivedAt')}
                type="date"
                required
                slotProps={{ inputLabel: { shrink: true } }}
                rules={{ validate: dateRequired }}
              />
              <FormTextField
                control={control}
                name="deadline"
                label={t('deadline')}
                type="date"
                required
                slotProps={{ inputLabel: { shrink: true } }}
                rules={{
                  validate: (value, values) =>
                    dateRequired(value) === true
                      ? !validDate(values.receivedAt) ||
                        value >= values.receivedAt ||
                        t('deadlineBeforeReceipt')
                      : dateRequired(value),
                }}
              />
              <FullWidth>
                <Alert severity="info">
                  {suggestion
                    ? t('suggestion', {
                        date: format(parseISO(suggestion), 'dd.MM.yyyy'),
                      })
                    : t('suggestionUnavailable')}
                </Alert>
                {suggestion && (
                  <Button
                    type="button"
                    onClick={() => {
                      setValue('deadline', suggestion, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                      void trigger('deadline')
                    }}
                  >
                    {t('applySuggestion')}
                  </Button>
                )}
              </FullWidth>
              <FullWidth>
                <FormTextField
                  control={control}
                  name="subject"
                  label={t('subject')}
                  required
                  multiline
                  minRows={2}
                  rules={{ validate: required }}
                />
              </FullWidth>
              <FullWidth>
                <FormTextField
                  control={control}
                  name="requestText"
                  label={t('requestText')}
                  required
                  multiline
                  minRows={7}
                  rules={{ validate: required }}
                />
              </FullWidth>
              <FullWidth>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {t('departmentsTitle')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('departmentsNotice')}
                </Typography>
                <Typography sx={{ mt: 1 }}>{t('departmentName')}</Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 2 }}
                >
                  {t('questionsNotice')}
                </Typography>
              </FullWidth>
            </Fields>
            <Actions>
              <Button component={Link} to={routes.upload} variant="outlined">
                {t('back')}
              </Button>
              <Button type="submit" variant="contained">
                {t('submit')}
              </Button>
            </Actions>
          </form>
        </Card>
      </Columns>
    </Page>
  )
}
