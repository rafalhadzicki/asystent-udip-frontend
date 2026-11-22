import { Page, Surface, Badge, Status, CaseLink } from './register-page.styles'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Download, Plus, RotateCcw, Search } from 'lucide-react'
import {
  useGetCases,
  useGetCaseYears,
  useGetDeadlineSummary,
  useRefetchCases,
} from '@/api/cases/cases.queries'
import {
  caseStatusSchema,
  type CaseSort,
  type CaseStatus,
} from '@/api/cases/cases.schemas'
import { useDebouncedValue } from '@/lib/use-debounced-value'
import { caseTabs, routes } from '@/app/routes'
import {
  caseInitials,
  extensionDays,
  formatDate,
  urgencyTones,
} from './register-utils'
import { useExportCases } from './use-export-cases'

const PAGE_SIZE = 10
const MAX_SEARCH_LENGTH = 200
const statuses = caseStatusSchema.options
type Sort = 'oldest' | 'newest' | 'deadline'
const apiSort: Record<Sort, CaseSort> = {
  oldest: 'RECEIVED_ASC',
  newest: 'RECEIVED_DESC',
  deadline: 'DEADLINE_ASC',
}

export const RegisterPage = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'register' })
  const [params, setParams] = useSearchParams()

  const search = params.get('search') ?? ''
  const statusParam = params.get('status')
  const status: CaseStatus | '' =
    statuses.find((value) => value === statusParam) ?? ''
  const sortParam = params.get('sort')
  const sort: Sort =
    sortParam === 'newest' || sortParam === 'deadline' ? sortParam : 'oldest'
  const pageParam = Number(params.get('page'))
  const requestedPage =
    Number.isSafeInteger(pageParam) && pageParam > 0 ? pageParam : 1

  const { caseYears, isCaseYearsError } = useGetCaseYears()
  // The years decide which year is shown by default, so the list waits for them.
  const yearsReady = caseYears !== undefined || isCaseYearsError
  const years = [...(caseYears ?? [])].sort((a, b) => b - a)
  // The API lists one receipt year at a time and defaults to the current one.
  const yearParam = Number(params.get('year'))
  const year =
    Number.isSafeInteger(yearParam) && yearParam > 0
      ? yearParam
      : (years[0] ?? new Date().getFullYear())

  const searchText = search.trim().slice(0, MAX_SEARCH_LENGTH)
  const debouncedSearch = useDebouncedValue(searchText)
  const filtersFor = (q: string) => ({
    year,
    status: status ? [status] : undefined,
    q: q || undefined,
    sort: apiSort[sort],
  })
  const { exportCsv, isExporting, exportError, dismissExportError } =
    useExportCases(filtersFor(searchText))
  const { getCasesResponse, isCasesLoading, isCasesPlaceholder, isCasesError } =
    useGetCases(
      {
        ...filtersFor(debouncedSearch),
        limit: PAGE_SIZE,
        offset: (requestedPage - 1) * PAGE_SIZE,
      },
      { enabled: yearsReady },
    )
  const isListPending = isCasesLoading || !yearsReady
  const refetchAll = useRefetchCases()
  const summary = useGetDeadlineSummary(years)

  const rows = getCasesResponse?.items ?? []
  const total = getCasesResponse?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(requestedPage, pageCount)
  const counts = {
    overdue: summary.overdue,
    today: summary.today,
    tomorrow: summary.tomorrow,
  }

  useEffect(() => {
    if (!isCasesPlaceholder && getCasesResponse && requestedPage > pageCount) {
      const next = new URLSearchParams(params)
      if (pageCount === 1) next.delete('page')
      else next.set('page', String(pageCount))
      setParams(next, { replace: true })
    }
  }, [
    isCasesPlaceholder,
    getCasesResponse,
    requestedPage,
    pageCount,
    params,
    setParams,
  ])

  const updateParams = (key: string, value: string, replace = false) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key !== 'page') next.delete('page')
    setParams(next, { replace })
  }
  const reset = () => {
    const next = new URLSearchParams(params)
    ;['search', 'year', 'status', 'sort', 'page'].forEach((key) =>
      next.delete(key),
    )
    setParams(next)
  }
  return (
    <Page>
      <Stack spacing={2.5}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="overline"
              sx={{ color: '#60758b', fontWeight: 700, letterSpacing: '.1em' }}
            >
              {t('eyebrow')}
            </Typography>
            <Typography
              component="h1"
              variant="h4"
              sx={{ fontWeight: 750, color: '#102b49', mb: 0.5 }}
            >
              {t('title')}
            </Typography>
            <Typography sx={{ color: '#607184' }}>
              {t('description')}
            </Typography>
          </Box>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<Download size={17} />}
              onClick={() => void exportCsv()}
              disabled={isExporting}
            >
              {t('export')}
            </Button>
            <Button
              component={RouterLink}
              to={routes.upload}
              variant="contained"
              startIcon={<Plus size={18} />}
            >
              {t('newCase')}
            </Button>
          </Stack>
        </Box>

        {(isCasesError || isCaseYearsError || summary.isError) && (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void refetchAll()}
              >
                {t('retry')}
              </Button>
            }
          >
            {t('loadError')}
          </Alert>
        )}
        {exportError && (
          <Alert severity="error" onClose={dismissExportError}>
            {t('exportError')}
          </Alert>
        )}
        <Surface sx={{ p: 2 }}>
          <Typography
            variant="body2"
            sx={{ color: '#647589', mb: 1.25, fontWeight: 600 }}
          >
            {t('summaryLabel')}
          </Typography>
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {(['overdue', 'today', 'tomorrow'] as const).map((level) => (
              <Badge key={level} $tone={level}>
                {t(`summary.${level}`)}: {counts[level]}
              </Badge>
            ))}
          </Stack>
          {summary.isPartial && (
            <Typography
              variant="caption"
              role="note"
              sx={{ color: '#647589', display: 'block', mt: 1 }}
            >
              {t('summaryPartial')}
            </Typography>
          )}
        </Surface>

        <Surface sx={{ p: 2 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
                lg: 'minmax(240px, 2fr) repeat(3, minmax(150px, 1fr)) auto',
              },
              gap: 1.5,
              alignItems: 'center',
            }}
          >
            <TextField
              fullWidth
              size="small"
              label={t('filters.search')}
              placeholder={t('filters.searchPlaceholder')}
              value={search}
              onChange={(event) =>
                updateParams('search', event.target.value, true)
              }
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} aria-hidden="true" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl fullWidth size="small">
              <InputLabel id="register-year-label">
                {t('filters.year')}
              </InputLabel>
              <Select
                labelId="register-year-label"
                label={t('filters.year')}
                value={year}
                onChange={(event) =>
                  updateParams('year', String(event.target.value))
                }
              >
                {years.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
                {!years.includes(year) && (
                  <MenuItem value={year}>{year}</MenuItem>
                )}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel id="register-status-label">
                {t('filters.status')}
              </InputLabel>
              <Select
                labelId="register-status-label"
                label={t('filters.status')}
                value={status}
                onChange={(event) => updateParams('status', event.target.value)}
              >
                <MenuItem value="">{t('filters.allStatuses')}</MenuItem>
                {statuses.map((value) => (
                  <MenuItem key={value} value={value}>
                    {t(`status.${value}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel id="register-sort-label">
                {t('filters.sort')}
              </InputLabel>
              <Select
                labelId="register-sort-label"
                label={t('filters.sort')}
                value={sort}
                onChange={(event) =>
                  updateParams(
                    'sort',
                    event.target.value === 'oldest' ? '' : event.target.value,
                  )
                }
              >
                <MenuItem value="oldest">{t('filters.oldest')}</MenuItem>
                <MenuItem value="newest">{t('filters.newest')}</MenuItem>
                <MenuItem value="deadline">{t('filters.deadline')}</MenuItem>
              </Select>
            </FormControl>
            <Button
              onClick={reset}
              startIcon={<RotateCcw size={16} />}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {t('filters.reset')}
            </Button>
          </Box>
        </Surface>

        <Surface sx={{ overflow: 'hidden' }}>
          <Box
            sx={{
              px: 2.5,
              py: 1.75,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
            }}
          >
            <Typography sx={{ fontWeight: 700 }}>
              {t('results', { count: total })}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: '#66798c', display: { xs: 'block', lg: 'none' } }}
            >
              {t('scrollHint')}
            </Typography>
          </Box>
          <TableContainer>
            <Table
              sx={{
                minWidth: 1200,
                '& th': {
                  backgroundColor: '#f4f7fa',
                  color: '#526579',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  whiteSpace: 'nowrap',
                },
                '& td': { verticalAlign: 'top', borderColor: '#edf1f5', py: 2 },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>{t('columns.ordinal')}</TableCell>
                  <TableCell>{t('columns.reference')}</TableCell>
                  <TableCell sx={{ minWidth: 300, width: '32%' }}>
                    {t('columns.subject')}
                  </TableCell>
                  <TableCell>{t('columns.received')}</TableCell>
                  <TableCell>{t('columns.deadline')}</TableCell>
                  <TableCell>{t('columns.responded')}</TableCell>
                  <TableCell>{t('columns.urgency')}</TableCell>
                  <TableCell>{t('columns.status')}</TableCell>
                  <TableCell>{t('columns.initials')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.sequenceNumber}</TableCell>
                    <TableCell>
                      <CaseLink to={routes.caseTab(item.id, caseTabs.request)}>
                        {item.caseNumber}
                      </CaseLink>
                    </TableCell>
                    <TableCell sx={{ overflowWrap: 'anywhere' }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, lineHeight: 1.5 }}
                      >
                        {item.subject}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(item.receivedAt)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(item.effectiveDueAt)}
                      {item.isExtended && (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', color: '#66798c' }}
                        >
                          {t('extension', { count: extensionDays(item) })}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(item.respondedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge $tone={urgencyTones[item.urgency]}>
                        {t(`urgency.${urgencyTones[item.urgency]}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Status $status={item.status}>
                        {t(`status.${item.status}`)}
                      </Status>
                      {item.departments.length > 0 && (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', color: '#66798c', mt: 0.5 }}
                        >
                          {t('departmentsAnswered', {
                            answered: item.departments.filter(
                              (department) => department.answered,
                            ).length,
                            count: item.departments.length,
                          })}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>
                      {caseInitials(item)}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && isListPending && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <Typography role="status" sx={{ fontWeight: 700 }}>
                        {t('loading')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {rows.length === 0 && !isListPending && !isCasesError && (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      <Typography sx={{ fontWeight: 700 }}>
                        {t('empty')}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: '#6b7b8b', mt: 0.5 }}
                      >
                        {t('emptyHint')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box
            sx={{
              px: 2.5,
              py: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
              borderTop: '1px solid #edf1f5',
            }}
          >
            <Typography variant="body2" sx={{ color: '#627387' }}>
              {t('range', {
                from: total ? (page - 1) * PAGE_SIZE + 1 : 0,
                to: Math.min(page * PAGE_SIZE, total),
                count: total,
              })}
            </Typography>
            {pageCount > 1 && (
              <Pagination
                aria-label={t('pagination')}
                count={pageCount}
                page={page}
                onChange={(_, value) =>
                  updateParams('page', value === 1 ? '' : String(value))
                }
                color="primary"
              />
            )}
          </Box>
        </Surface>
      </Stack>
    </Page>
  )
}
