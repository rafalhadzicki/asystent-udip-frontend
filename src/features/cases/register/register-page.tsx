import { Page, Surface, Badge, Status, CaseLink } from './register-page.styles'
import { useMemo, useState } from 'react'
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
import { useDemoStore } from '@/features/demo/demo-store'
import type { CaseStatus } from '@/features/demo/types'
import { caseTabs, routes } from '@/app/routes'
import { csvCell, formatDate, getUrgency } from './register-utils'

const PAGE_SIZE = 10
const statuses: CaseStatus[] = [
  'analysis',
  'waiting',
  'draft',
  'redaction',
  'completed',
]
type Sort = 'oldest' | 'newest' | 'deadline'
export const RegisterPage = () => {
  const { t } = useTranslation('translation', { keyPrefix: 'register' })
  const { cases } = useDemoStore()
  const [params, setParams] = useSearchParams()
  const [exportError, setExportError] = useState(false)

  const search = params.get('search') ?? ''
  const year = params.get('year') ?? ''
  const statusParam = params.get('status') ?? ''
  const status = statuses.find((value) => value === statusParam) ?? ''
  const sortParam = params.get('sort')
  const sort: Sort =
    sortParam === 'newest' || sortParam === 'deadline' ? sortParam : 'oldest'
  const pageParam = Number(params.get('page'))
  const requestedPage =
    Number.isSafeInteger(pageParam) && pageParam > 0 ? pageParam : 1

  const years = useMemo(
    () =>
      [
        ...new Set(
          cases
            .map((item) => item.receivedAt.slice(0, 4))
            .filter((value) => /^\d{4}$/.test(value)),
        ),
      ]
        .sort()
        .reverse(),
    [cases],
  )
  const counts = useMemo(
    () =>
      cases.reduce(
        (result, item) => {
          const level = getUrgency(item)
          if (level === 'overdue' || level === 'today' || level === 'tomorrow')
            result[level] += 1
          return result
        },
        { overdue: 0, today: 0, tomorrow: 0 },
      ),
    [cases],
  )
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pl')
    return cases
      .filter(
        (item) =>
          (!query ||
            [item.reference, item.subject, item.applicant, item.owner].some(
              (value) => value.toLocaleLowerCase('pl').includes(query),
            )) &&
          (!year || item.receivedAt.slice(0, 4) === year) &&
          (!status || item.status === status),
      )
      .sort((a, b) => {
        const aDate = sort === 'deadline' ? a.deadline : a.receivedAt
        const bDate = sort === 'deadline' ? b.deadline : b.receivedAt
        if (!aDate || !bDate)
          return aDate
            ? -1
            : bDate
              ? 1
              : a.reference.localeCompare(b.reference, 'pl')
        const order = aDate.localeCompare(bDate)
        return (
          (sort === 'newest' ? -order : order) ||
          a.reference.localeCompare(b.reference, 'pl')
        )
      })
  }, [cases, search, year, status, sort])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(requestedPage, pageCount)
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
  const exportCsv = () => {
    setExportError(false)
    try {
      const headers = [
        t('columns.reference'),
        t('columns.subject'),
        t('columns.applicant'),
        t('columns.received'),
        t('columns.deadline'),
        t('columns.urgency'),
        t('columns.status'),
        t('columns.owner'),
      ]
      const lines = filtered.map((item) => [
        item.reference,
        item.subject,
        item.applicant,
        formatDate(item.receivedAt),
        formatDate(item.deadline),
        t(`urgency.${getUrgency(item)}`),
        t(`status.${item.status}`),
        item.owner,
      ])
      const csv =
        '\ufeff' +
        [headers, ...lines]
          .map((line) => line.map(csvCell).join(';'))
          .join('\r\n')
      const url = URL.createObjectURL(
        new Blob([csv], { type: 'text/csv;charset=utf-8' }),
      )
      try {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = t('exportFilename')
        document.body.appendChild(anchor)
        try {
          anchor.click()
        } finally {
          anchor.remove()
        }
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch (error) {
      console.error('Cannot export demo register', error)
      setExportError(true)
    }
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
              onClick={exportCsv}
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

        {exportError && (
          <Alert severity="error" onClose={() => setExportError(false)}>
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
                onChange={(event) => updateParams('year', event.target.value)}
              >
                <MenuItem value="">{t('filters.allYears')}</MenuItem>
                {years.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
                {year && !years.includes(year) && (
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
              {t('results', { count: filtered.length })}
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
                minWidth: 1050,
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
                  <TableCell>{t('columns.reference')}</TableCell>
                  <TableCell sx={{ minWidth: 300, width: '32%' }}>
                    {t('columns.subject')}
                  </TableCell>
                  <TableCell>{t('columns.received')}</TableCell>
                  <TableCell>{t('columns.deadline')}</TableCell>
                  <TableCell>{t('columns.urgency')}</TableCell>
                  <TableCell>{t('columns.status')}</TableCell>
                  <TableCell>{t('columns.owner')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <CaseLink to={routes.caseTab(item.id, caseTabs.request)}>
                        {item.reference}
                      </CaseLink>
                    </TableCell>
                    <TableCell sx={{ overflowWrap: 'anywhere' }}>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 600, lineHeight: 1.5 }}
                      >
                        {item.subject}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: '#6b7b8b', mt: 0.5, lineHeight: 1.5 }}
                      >
                        {item.applicant}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(item.receivedAt)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatDate(item.deadline)}
                    </TableCell>
                    <TableCell>
                      <Badge $tone={getUrgency(item)}>
                        {t(`urgency.${getUrgency(item)}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Status $status={item.status}>
                        {t(`status.${item.status}`)}
                      </Status>
                    </TableCell>
                    <TableCell sx={{ minWidth: 150 }}>{item.owner}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
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
                from: filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0,
                to: Math.min(page * PAGE_SIZE, filtered.length),
                count: filtered.length,
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
