import { useState } from 'react'
import { Alert, Button, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { addDays, format, isValid, parseISO } from 'date-fns'
import { ArrowRight, FileText, Pencil } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useOutletContext } from 'react-router-dom'
import { FormTextField } from '@/components/form/form-text-field'
import { displayDate } from '@/features/demo/date-utils'
import { useDemoStore } from '@/features/demo/demo-store'
import type { CaseItem } from '@/features/demo/types'

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
type Notice = 'saved' | 'scopeReset'

const DEADLINE_DAYS = 14
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

const toValues = (item: CaseItem): RequestValues => ({
  reference: item.reference,
  subject: item.subject,
  applicant: item.applicant,
  receivedAt: item.receivedAt,
  writtenAt: item.writtenAt,
  deadline: item.deadline,
  requestText: item.requestText,
})

const isDate = (value: string) =>
  DATE_PATTERN.test(value) && isValid(parseISO(value))

const proposeDeadline = (receivedAt: string) =>
  isDate(receivedAt)
    ? format(addDays(parseISO(receivedAt), DEADLINE_DAYS), 'yyyy-MM-dd')
    : ''

const Layout = styled('div')(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(3),
  alignItems: 'start',
  [theme.breakpoints.up('md')]: { gridTemplateColumns: '320px minmax(0, 1fr)' },
}))

const Section = styled('section')(({ theme }) => ({
  padding: theme.spacing(3),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2.5),
}))

const SectionHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: theme.spacing(1.5),
}))

const SectionTitle = styled(Typography)(({ theme }) => ({
  fontSize: '1rem',
  fontWeight: 600,
  color: theme.palette.primary.main,
}))

const SourceIcon = styled('div')(({ theme }) => ({
  width: 48,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 10,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '& svg': { width: 24, height: 24 },
}))

const Details = styled('dl')(({ theme }) => ({
  margin: 0,
  display: 'grid',
  gap: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
}))

const Detail = styled('div', { shouldForwardProp: (prop) => prop !== 'wide' })<{
  wide?: boolean
}>(({ wide }) => ({ minWidth: 0, gridColumn: wide ? '1 / -1' : undefined }))

const Term = styled('dt')(({ theme }) => ({
  marginBottom: theme.spacing(0.5),
  fontSize: '0.8125rem',
  color: theme.palette.text.secondary,
}))

const Description = styled('dd')(({ theme }) => ({
  margin: 0,
  color: theme.palette.text.primary,
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
}))

const RequestText = styled(Description)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.default,
  lineHeight: 1.6,
}))

const FieldGrid = styled('div')(({ theme }) => ({
  display: 'grid',
  gap: theme.spacing(2),
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  '& .wide': { gridColumn: '1 / -1' },
}))

const Actions = styled('div')(({ theme }) => ({
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
  gap: theme.spacing(1.5),
}))

const SourceSection = ({ item }: { item: CaseItem }) => {
  const { t } = useTranslation('request')
  const size = new Intl.NumberFormat('pl-PL', {
    maximumFractionDigits: 0,
  }).format(item.source.size / 1024)
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
      <Alert severity="info">{t('source.notPersisted')}</Alert>
    </Section>
  )
}

const RequestEditor = ({ item }: { item: CaseItem }) => {
  const { t } = useTranslation('request')
  const { cases, updateCase } = useDemoStore()
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const readOnly = item.status === 'completed'
  const { control, handleSubmit, reset, setValue, getValues } =
    useForm<RequestValues>({
      mode: 'onBlur',
      defaultValues: toValues(item),
    })
  const [receivedAt, deadline, subject, requestText] = useWatch({
    control,
    name: ['receivedAt', 'deadline', 'subject', 'requestText'],
  })

  const proposal = proposeDeadline(receivedAt)
  const scopeChanged =
    subject.trim() !== item.subject.trim() ||
    requestText.trim() !== item.requestText.trim()
  const hasDownstreamWork =
    item.status !== 'analysis' ||
    item.responseText !== '' ||
    item.redactions.length > 0 ||
    item.redactionConfirmed

  const required = (value: string) =>
    value.trim() !== '' || t('errors.required')
  const date = (value: string) => isDate(value) || t('errors.date')

  const onSubmit = (values: RequestValues) => {
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
    const resetsScope = scopeChanged && hasDownstreamWork
    updateCase(
      item.id,
      resetsScope
        ? {
            ...trimmed,
            status: 'analysis',
            responseText: '',
            redactions: [],
            redactionConfirmed: false,
          }
        : trimmed,
    )
    reset(trimmed)
    setEditing(false)
    setNotice(resetsScope ? 'scopeReset' : 'saved')
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
          severity={notice === 'scopeReset' ? 'warning' : 'success'}
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
                  unique: (value) =>
                    !cases.some(
                      (other) =>
                        other.id !== item.id &&
                        other.reference.trim() === value.trim(),
                    ) || t('errors.referenceTaken'),
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
              required
              slotProps={{ inputLabel: { shrink: true } }}
              rules={{
                validate: {
                  date,
                  order: (value) =>
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
              slotProps={{ inputLabel: { shrink: true } }}
              helperText={
                proposal
                  ? t('deadlineProposal', { date: displayDate(proposal) })
                  : undefined
              }
              rules={{
                validate: {
                  date,
                  order: (value) =>
                    !isDate(getValues('receivedAt')) ||
                    value >= getValues('receivedAt') ||
                    t('errors.deadlineBeforeReceived'),
                },
              }}
            />
            {proposal && proposal !== deadline && (
              <Actions className="wide">
                <Button
                  variant="text"
                  onClick={() =>
                    setValue('deadline', proposal, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  {t('actions.applyDeadline', { date: displayDate(proposal) })}
                </Button>
              </Actions>
            )}
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
            {scopeChanged && hasDownstreamWork && (
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
            to={`/sprawy/${item.id}/analiza`}
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
