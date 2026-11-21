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
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { FormTextField } from '@/components/form/form-text-field'
import { useDemoStore } from '@/features/demo/demo-store'
import type { UploadDraft } from '@/features/demo/types'
import { getApiErrorKind } from '@/api/errors'
import {
  useCreateCaseFromDraft,
  type VerifiedCaseValues,
} from '../use-create-case-from-draft'
import {
  isFutureDate,
  toSubmitError,
  type SubmitError,
} from './verification-utils'
import { validIsoDate } from '@/features/demo/date-utils'
import { caseTabs, routes } from '@/app/routes'

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
  const { createFromDraft, isCreatingCase } = useCreateCaseFromDraft(draft)
  const [submitError, setSubmitError] = useState<SubmitError | null>(null)
  const navigate = useNavigate()
  const submitted = useRef(false)
  const { control, handleSubmit, setError } = useForm<VerifiedCaseValues>({
    defaultValues: {
      applicant: draft.applicant,
      reference: draft.reference ?? '',
      subject: draft.subject,
      writtenAt: draft.writtenAt,
      receivedAt: draft.receivedAt,
      requestText: draft.requestText,
    },
  })
  const required = (value: string) => value.trim().length > 0 || t('required')
  const dateRequired = (value: string) =>
    (required(value) === true && validDate(value)) ||
    (value.trim() ? t('invalidDate') : t('required'))
  const onSubmit = async (values: VerifiedCaseValues) => {
    if (submitted.current) return
    submitted.current = true
    setSubmitError(null)
    try {
      const caseId = await createFromDraft(values)
      await navigate(routes.caseTab(caseId, caseTabs.analysis))
    } catch (error) {
      submitted.current = false
      const kind = getApiErrorKind(error)
      if (kind === 'conflict')
        setError('reference', { message: t('duplicateReference') })
      else if (kind === 'invalid' && isFutureDate(values.receivedAt.trim()))
        setError('receivedAt', { message: t('receivedAtInFuture') })
      else setSubmitError(toSubmitError(error))
    }
  }

  return (
    <Page>
      <Typography variant="overline" color="primary">
        {t('step')}
      </Typography>
      <Alert severity="info" sx={{ mt: 1 }}>
        {t('ocrNotice')}
      </Alert>
      {draft.textExtractionStatus &&
        draft.textExtractionStatus !== 'EXTRACTED' && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {t(`extractionStatus.${draft.textExtractionStatus}`)}
          </Alert>
        )}
      {draft.warnings?.map((warning) => (
        <Alert key={warning} severity="warning" sx={{ mt: 1 }}>
          {t(`warnings.${warning}`)}
        </Alert>
      ))}
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
                rules={{ validate: required }}
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
              <FullWidth>
                <Alert severity="info">{t('deadlineFromServer')}</Alert>
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
                <Typography variant="body2" color="text.secondary">
                  {t('questionsNotice')}
                </Typography>
              </FullWidth>
            </Fields>
            {submitError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {t(`submitErrors.${submitError}`)}
              </Alert>
            )}
            <Actions>
              <Button component={Link} to={routes.upload} variant="outlined">
                {t('back')}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={isCreatingCase}
              >
                {t('submit')}
              </Button>
            </Actions>
          </form>
        </Card>
      </Columns>
    </Page>
  )
}
