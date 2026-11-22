import {
  Page,
  Header,
  Content,
  GridWrapper,
  Grid,
  Weekday,
  Day,
  Reference,
  Detail,
  CaseCard,
} from './calendar-page.styles'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { pl } from 'date-fns/locale'
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControlLabel,
  IconButton,
  Switch,
  Typography,
} from '@mui/material'
import { useGetCasesOfYears, useRefetchCases } from '@/api/cases/cases.queries'
import type { CaseStatus } from '@/api/cases/cases.schemas'
import {
  formatDate,
  urgencyTones,
} from '@/features/cases/register/register-utils'
import { caseTabs, routes } from '@/app/routes'

type Urgency = (typeof urgencyTones)[keyof typeof urgencyTones]

const urgencyColors: Record<Urgency, { background: string; color: string }> = {
  overdue: { background: '#fde8e7', color: '#a51c1c' },
  today: { background: '#fff0dc', color: '#9b4b00' },
  tomorrow: { background: '#fff0dc', color: '#9b4b00' },
  normal: { background: '#e8f0fb', color: '#1b58a3' },
  completed: { background: '#e9edf0', color: '#526175' },
}

const statusKeys: Record<CaseStatus, `status.${CaseStatus}`> = {
  NEW: 'status.NEW',
  SENT_TO_DEPARTMENTS: 'status.SENT_TO_DEPARTMENTS',
  RESPONSE_PREPARED: 'status.RESPONSE_PREPARED',
  RESPONSE_SENT: 'status.RESPONSE_SENT',
}

const urgencyKeys: Record<Urgency, `urgency.${Urgency}`> = {
  overdue: 'urgency.overdue',
  today: 'urgency.today',
  tomorrow: 'urgency.tomorrow',
  normal: 'urgency.normal',
  completed: 'urgency.completed',
}

const weekStartsOn = 1

export const CalendarPage = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'calendar' })
  const [today] = useState(() => startOfDay(new Date()))
  const [month, setMonth] = useState(() => startOfMonth(today))
  const [selected, setSelected] = useState(today)
  const [showCompleted, setShowCompleted] = useState(false)
  // A case received last year can still have its deadline in this year.
  const year = month.getFullYear()
  const {
    items: cases,
    isPartial,
    isLoading,
    isError,
  } = useGetCasesOfYears([year, year - 1])
  const refetchCases = useRefetchCases()

  const visibleCases = useMemo(
    () =>
      cases.filter((item) => showCompleted || item.status !== 'RESPONSE_SENT'),
    [cases, showCompleted],
  )
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn }),
  })
  const weekdays = days.slice(0, 7)
  const selectedCases = visibleCases.filter((item) =>
    isSameDay(parseISO(item.effectiveDueAt), selected),
  )
  const monthCases = cases.filter(
    (item) =>
      item.status !== 'RESPONSE_SENT' &&
      isSameMonth(parseISO(item.effectiveDueAt), month),
  )
  const summaryKinds: Urgency[] = ['overdue', 'today', 'tomorrow', 'normal']

  const changeMonth = (amount: number) => {
    const next = addMonths(month, amount)
    setMonth(next)
    setSelected(startOfMonth(next))
  }

  const selectDay = (day: Date) => {
    setSelected(day)
    setMonth(startOfMonth(day))
  }

  return (
    <Page>
      <Header>
        <Typography variant="overline" color="text.secondary">
          {t('eyebrow')}
        </Typography>
        <Typography variant="h1">{t('title')}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          {t('description')}
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
          {summaryKinds.map((kind) => (
            <Chip
              key={kind}
              size="small"
              label={t('summary', {
                label: t(urgencyKeys[kind]),
                count: monthCases.filter(
                  (item) => urgencyTones[item.urgency] === kind,
                ).length,
              })}
              sx={{ ...urgencyColors[kind], fontWeight: 600 }}
            />
          ))}
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1,
            mt: 2,
          }}
        >
          <IconButton
            aria-label={t('previousMonth')}
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft size={20} />
          </IconButton>
          <Typography
            component="h2"
            variant="h6"
            sx={{
              minWidth: 150,
              textAlign: 'center',
              textTransform: 'capitalize',
            }}
          >
            {format(month, 'LLLL yyyy', { locale: pl })}
          </Typography>
          <IconButton
            aria-label={t('nextMonth')}
            onClick={() => changeMonth(1)}
          >
            <ChevronRight size={20} />
          </IconButton>
          <Button
            variant="outlined"
            startIcon={<CalendarDays size={17} />}
            onClick={() => {
              setMonth(startOfMonth(today))
              setSelected(today)
            }}
          >
            {t('todayButton', {
              date: formatDate(format(today, 'yyyy-MM-dd')),
            })}
          </Button>
          <FormControlLabel
            sx={{ ml: { xs: 0, sm: 'auto' }, mr: 0 }}
            control={
              <Switch
                checked={showCompleted}
                onChange={(event) => setShowCompleted(event.target.checked)}
              />
            }
            label={t('showCompleted')}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          {t('summaryHint')}
        </Typography>
        {isError && (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
            action={
              <Button color="inherit" size="small" onClick={refetchCases}>
                {t('retry')}
              </Button>
            }
          >
            {t('loadError')}
          </Alert>
        )}
        {isPartial && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {t('partial')}
          </Alert>
        )}
        {isLoading && (
          <Typography role="status" variant="body2" sx={{ mt: 2 }}>
            {t('loading')}
          </Typography>
        )}
      </Header>

      <Content>
        <GridWrapper>
          <Grid>
            {weekdays.map((day) => (
              <Weekday key={day.toISOString()}>
                {format(day, 'EEEE', { locale: pl })}
              </Weekday>
            ))}
            {days.map((day) => {
              const items = visibleCases.filter((item) =>
                isSameDay(parseISO(item.effectiveDueAt), day),
              )
              const selectedDay = isSameDay(day, selected)
              return (
                <Day
                  key={format(day, 'yyyy-MM-dd')}
                  type="button"
                  selectedDay={selectedDay}
                  outsideMonth={!isSameMonth(day, month)}
                  aria-pressed={selectedDay}
                  aria-label={t('dayLabel', {
                    date: format(day, 'd MMMM yyyy', { locale: pl }),
                    count: items.length,
                  })}
                  onClick={() => selectDay(day)}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      width: '100%',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                    }}
                  >
                    <span>{format(day, 'd')}</span>
                    {isSameDay(day, today) && <span>{t('today')}</span>}
                  </Box>
                  {items.slice(0, 2).map((item) => (
                    <Reference key={item.id} title={item.caseNumber}>
                      {item.caseNumber}
                    </Reference>
                  ))}
                  {items.length > 2 && (
                    <Reference>+{items.length - 2}</Reference>
                  )}
                  {items.length > 0 && (
                    <Box
                      component="span"
                      sx={{ mt: 'auto', fontSize: '0.7rem', opacity: 0.85 }}
                    >
                      {t('caseCount', { count: items.length })}
                    </Box>
                  )}
                </Day>
              )
            })}
          </Grid>
        </GridWrapper>

        <Detail>
          <Typography variant="overline" color="primary">
            {t('selectedDay')}
          </Typography>
          <Typography component="h2" variant="h6">
            {format(selected, 'd MMMM yyyy', { locale: pl })}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ textTransform: 'capitalize' }}
          >
            {format(selected, 'EEEE', { locale: pl })}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, mb: 2 }}
          >
            {t('caseCount', { count: selectedCases.length })}
          </Typography>
          {selectedCases.length === 0 ? (
            <Typography color="text.secondary">{t('emptyDay')}</Typography>
          ) : (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              {selectedCases.map((item) => {
                const kind = urgencyTones[item.urgency]
                return (
                  <CaseCard key={item.id}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {item.caseNumber}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.5,
                        overflowWrap: 'anywhere',
                        fontWeight: 600,
                      }}
                    >
                      {item.subject}
                    </Typography>
                    <Box
                      sx={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 0.75,
                        mt: 1.5,
                      }}
                    >
                      <Chip size="small" label={t(statusKeys[item.status])} />
                      <Chip
                        size="small"
                        label={t(urgencyKeys[kind])}
                        sx={urgencyColors[kind]}
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1.5 }}
                    >
                      {t('receivedAt', { date: formatDate(item.receivedAt) })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('deadline', { date: formatDate(item.effectiveDueAt) })}
                    </Typography>
                    {kind === 'normal' && (
                      <Typography variant="body2" color="text.secondary">
                        {t('daysRemaining', {
                          count: item.daysLeft,
                        })}
                      </Typography>
                    )}
                    <Button
                      component={Link}
                      to={routes.caseTab(item.id, caseTabs.request)}
                      endIcon={<ArrowRight size={16} />}
                      sx={{ mt: 1, px: 0 }}
                    >
                      {t('openCase')}
                    </Button>
                  </CaseCard>
                )
              })}
            </Box>
          )}
        </Detail>
      </Content>
    </Page>
  )
}
