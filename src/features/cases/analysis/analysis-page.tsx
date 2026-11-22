import { Layout, Item, Actions } from './analysis-page.styles'
import { SectionCard as Panel } from '@/components/ui/section-card'
import { useSyncCaseStatus } from '../use-sync-case-status'
import { useAiErrorMessage } from '../use-ai-error-message'
import {
  bestMatchPerDocument,
  selectedDepartments,
  selectedQuestions,
} from './analysis-utils'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import { StepBackButton } from '../step-back-button'
import {
  useGetKnowledgeDocument,
  useSearchKnowledge,
} from '@/api/knowledge/knowledge.queries'
import { KnowledgePreviewDialog } from '@/features/knowledge/knowledge-dialogs'
import { useLocalStore } from '@/features/cases/local-store'
import { caseTabs, routes } from '@/app/routes'
import type { CaseItem, Department, Question } from '@/features/cases/types'
import { useGetDepartments } from '@/api/departments/departments.queries'
import {
  useSetCaseDepartments,
  useSetCaseQuestions,
} from '@/api/cases/cases.queries'

const EXAMPLES_LIMIT = 5
// The search endpoint accepts at most 2000 characters of the query.
const MAX_QUERY_LENGTH = 2000

const newId = () => globalThis.crypto.randomUUID()

// The search finds fragments; the preview needs the whole document.
const ExamplePreview = ({
  id,
  onClose,
}: {
  id: string
  onClose: () => void
}) => {
  const { knowledgeDocument } = useGetKnowledgeDocument(id)
  return knowledgeDocument ? (
    <KnowledgePreviewDialog item={knowledgeDocument} onClose={onClose} />
  ) : null
}

const AnalysisEditor = ({ item }: { item: CaseItem }) => {
  const aiErrorMessage = useAiErrorMessage()
  const { t } = useTranslation('translation', { keyPrefix: 'analysis' })
  const { updateCase } = useLocalStore()
  const syncCaseStatus = useSyncCaseStatus()
  const navigate = useNavigate()
  const [questions, setQuestions] = useState<Question[]>(() =>
    item.questions.map((question) => ({ ...question })),
  )
  const [departments, setDepartments] = useState<Department[]>(() =>
    item.departments.map((department) => ({ ...department })),
  )
  const [departmentName, setDepartmentName] = useState('')
  const [departmentReason, setDepartmentReason] = useState('')
  const [departmentError, setDepartmentError] = useState('')
  const [attemptedContinue, setAttemptedContinue] = useState(false)
  const [message, setMessage] = useState('')
  const [saveFailed, setSaveFailed] = useState(false)
  const { setCaseQuestionsAsync, isSettingCaseQuestions } =
    useSetCaseQuestions()
  const { setCaseDepartmentsAsync, isSettingCaseDepartments } =
    useSetCaseDepartments()
  const [exampleId, setExampleId] = useState<string | null>(null)
  const readonly = item.status === 'completed'
  const { departments: departmentOptions, isDepartmentsError } =
    useGetDepartments()
  const departmentsChanged =
    JSON.stringify(selectedDepartments(departments)) !==
    JSON.stringify(selectedDepartments(item.departments))
  const questionsChanged =
    JSON.stringify(selectedQuestions(questions)) !==
    JSON.stringify(selectedQuestions(item.questions))
  const changedScope = questionsChanged || departmentsChanged
  const isSaving = isSettingCaseQuestions || isSettingCaseDepartments
  const hasDraft = Boolean(
    item.responseText ||
    item.redactions.length ||
    item.redactionConfirmed ||
    item.status === 'draft' ||
    item.status === 'redaction',
  )
  const invalidatesDraft = changedScope && hasDraft
  const questionsInvalid =
    !questions.some((question) => question.selected) ||
    questions.some((question) => question.selected && !question.text.trim())
  const departmentsInvalid = !departments.some(
    (department) => department.selected,
  )
  const searchText = item.requestText.trim().slice(0, MAX_QUERY_LENGTH)
  const {
    knowledgeMatches,
    isSearchingKnowledge,
    isKnowledgeSearchError,
    knowledgeSearchError,
    refetchKnowledgeSearch,
  } = useSearchKnowledge(
    { query: searchText, k: EXAMPLES_LIMIT, categories: ['RESPONSE'] },
    Boolean(searchText),
  )
  const examples = bestMatchPerDocument(knowledgeMatches ?? [])

  const updateQuestion = (id: string, changes: Partial<Question>) => {
    setQuestions((current) =>
      current.map((question) =>
        question.id === id ? { ...question, ...changes } : question,
      ),
    )
    setMessage('')
  }
  const updateDepartment = (id: string, changes: Partial<Department>) => {
    setDepartments((current) =>
      current.map((department) =>
        department.id === id ? { ...department, ...changes } : department,
      ),
    )
    setMessage('')
  }
  const addDepartment = () => {
    const name = departmentName.trim()
    if (!name) {
      setDepartmentError(t('departmentNameRequired'))
      return
    }
    if (
      departments.some(
        (department) =>
          department.name.trim().toLocaleLowerCase() ===
          name.toLocaleLowerCase(),
      )
    ) {
      setDepartmentError(t('departmentDuplicate'))
      return
    }
    const matchedDepartment = departmentOptions?.find(
      (department) =>
        department.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    )
    // The server accepts only departments from its dictionary.
    if (!matchedDepartment) {
      setDepartmentError(t('departmentUnknown'))
      return
    }
    setDepartments((current) => [
      ...current,
      {
        id: matchedDepartment?.id ?? newId(),
        name,
        reason: departmentReason.trim(),
        selected: true,
      },
    ])
    setDepartmentName('')
    setDepartmentReason('')
    setDepartmentError('')
    setMessage('')
  }
  // Questions and departments of a case on the server are replaced as a whole;
  // only the selected ones are kept.
  const saveScopeOnServer = async () => {
    let status = item.apiStatus
    if (questionsChanged)
      status = (
        await setCaseQuestionsAsync({
          id: item.id,
          questions: questions
            .filter((question) => question.selected)
            .map(({ text, departmentId }) => ({
              text: text.trim(),
              departmentId,
            })),
        })
      ).status
    if (departmentsChanged)
      status = (
        await setCaseDepartmentsAsync({
          id: item.id,
          departmentIds: departments
            .filter((department) => department.selected)
            .map(({ id }) => id),
        })
      ).status
    return status
  }
  const save = async (continueToMaterials: boolean) => {
    if (readonly) {
      if (continueToMaterials)
        navigate(routes.caseTab(item.id, caseTabs.materials))
      return
    }
    if (continueToMaterials || item.analysisNeedsReview) {
      setAttemptedContinue(true)
      if (questionsInvalid || departmentsInvalid) return
    }
    try {
      // The server moves a new case on by itself when departments are set.
      const apiStatus = await saveScopeOnServer()
      if (continueToMaterials || invalidatesDraft)
        await syncCaseStatus({ id: item.id, apiStatus }, 'SENT_TO_DEPARTMENTS')
    } catch (error) {
      console.error('Cannot save the scope of the case', error)
      setSaveFailed(true)
      return
    }
    setSaveFailed(false)
    const changes: Partial<CaseItem> = {
      questions,
      departments,
      departmentReasons: Object.fromEntries(
        departments.map(({ id, reason }) => [id, reason]),
      ),
      analysisNeedsReview: false,
    }
    if (changedScope) {
      changes.redactions = []
      changes.redactionConfirmed = false
      if (
        item.responseText ||
        item.status === 'draft' ||
        item.status === 'redaction'
      )
        changes.status = 'waiting'
    }
    if (continueToMaterials && item.status === 'analysis')
      changes.status = 'waiting'
    updateCase(item.id, changes)
    setMessage(t(invalidatesDraft ? 'invalidationSaved' : 'saved'))
    if (continueToMaterials)
      navigate(routes.caseTab(item.id, caseTabs.materials))
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          {t('title')}
        </Typography>
        <Typography color="text.secondary">{t('intro')}</Typography>
      </Box>
      {item.analysisNeedsReview && (
        <Alert severity="warning">{t('reviewRequired')}</Alert>
      )}
      {readonly && <Alert severity="info">{t('readonly')}</Alert>}
      {invalidatesDraft && !readonly && (
        <Alert severity="warning">{t('invalidationWarning')}</Alert>
      )}
      {saveFailed && <Alert severity="error">{t('saveFailed')}</Alert>}
      {message && (
        <Alert severity="success" role="status">
          {message}
        </Alert>
      )}
      <Layout>
        <Stack spacing={2}>
          <Panel aria-labelledby="analysis-questions-title">
            <Stack spacing={2}>
              <Box>
                <Typography
                  id="analysis-questions-title"
                  variant="h6"
                  component="h3"
                  sx={{ fontWeight: 700 }}
                >
                  {t('questionsTitle')}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {t('questionsDescription')}
                </Typography>
              </Box>
              {questions.map((question, index) => (
                <Item key={question.id}>
                  <Stack spacing={1}>
                    <Stack
                      direction="row"
                      sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={question.selected}
                            disabled={readonly}
                            onChange={(event) =>
                              updateQuestion(question.id, {
                                selected: event.target.checked,
                              })
                            }
                          />
                        }
                        label={t('selectQuestion', { number: index + 1 })}
                      />
                      {!readonly && (
                        <IconButton
                          aria-label={t('removeQuestion', {
                            number: index + 1,
                          })}
                          onClick={() => {
                            setQuestions((current) =>
                              current.filter(
                                (entry) => entry.id !== question.id,
                              ),
                            )
                            setMessage('')
                          }}
                        >
                          <Trash2 size={18} />
                        </IconButton>
                      )}
                    </Stack>
                    <TextField
                      label={t('questionLabel', { number: index + 1 })}
                      multiline
                      minRows={2}
                      value={question.text}
                      disabled={readonly}
                      error={
                        attemptedContinue &&
                        question.selected &&
                        !question.text.trim()
                      }
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          text: event.target.value,
                        })
                      }
                    />
                  </Stack>
                </Item>
              ))}
              {attemptedContinue && questionsInvalid && (
                <Alert severity="error">{t('questionRequired')}</Alert>
              )}
              {!readonly && (
                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<Plus size={18} />}
                    onClick={() => {
                      setQuestions((current) => [
                        ...current,
                        { id: newId(), text: '', selected: true },
                      ])
                      setMessage('')
                    }}
                  >
                    {t('addQuestion')}
                  </Button>
                </Box>
              )}
            </Stack>
          </Panel>
          <Panel aria-labelledby="analysis-departments-title">
            <Stack spacing={2}>
              <Box>
                <Typography
                  id="analysis-departments-title"
                  variant="h6"
                  component="h3"
                  sx={{ fontWeight: 700 }}
                >
                  {t('departmentsTitle')}
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  {t('departmentsDescription')}
                </Typography>
              </Box>
              {departments.map((department) => (
                <Item key={department.id}>
                  <Stack
                    direction="row"
                    sx={{
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Box>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={department.selected}
                            disabled={readonly}
                            onChange={(event) =>
                              updateDepartment(department.id, {
                                selected: event.target.checked,
                              })
                            }
                          />
                        }
                        label={department.name}
                        aria-label={t('selectDepartment', {
                          name: department.name,
                        })}
                      />
                      <Typography variant="body2" color="text.secondary">
                        <strong>{t('reason')}:</strong>{' '}
                        {department.reason || t('noReason')}
                      </Typography>
                    </Box>
                    {!readonly && (
                      <IconButton
                        aria-label={t('removeDepartment', {
                          name: department.name,
                        })}
                        onClick={() => {
                          setDepartments((current) =>
                            current.filter(
                              (entry) => entry.id !== department.id,
                            ),
                          )
                          setMessage('')
                        }}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    )}
                  </Stack>
                </Item>
              ))}
              {attemptedContinue && departmentsInvalid && (
                <Alert severity="error">{t('departmentRequired')}</Alert>
              )}
              {!readonly && (
                <Stack spacing={1.5}>
                  <TextField
                    label={t('customName')}
                    value={departmentName}
                    error={Boolean(departmentError)}
                    helperText={departmentError || t('departmentLookupHint')}
                    slotProps={{ htmlInput: { list: 'department-options' } }}
                    onChange={(event) => {
                      setDepartmentName(event.target.value)
                      setDepartmentError('')
                    }}
                  />
                  <datalist id="department-options">
                    {departmentOptions?.map((department) => (
                      <option key={department.id} value={department.name}>
                        {department.symbol}
                      </option>
                    ))}
                  </datalist>
                  {isDepartmentsError && (
                    <Alert severity="warning">
                      {t('departmentLookupError')}
                    </Alert>
                  )}
                  <TextField
                    label={t('customReason')}
                    value={departmentReason}
                    onChange={(event) =>
                      setDepartmentReason(event.target.value)
                    }
                  />
                  <Box>
                    <Button
                      variant="outlined"
                      startIcon={<Plus size={18} />}
                      onClick={addDepartment}
                    >
                      {t('addDepartment')}
                    </Button>
                  </Box>
                </Stack>
              )}
              <Alert severity="info">{t('contact')}</Alert>
            </Stack>
          </Panel>
        </Stack>
        <Panel aria-labelledby="analysis-examples-title">
          <Stack spacing={2}>
            <Box>
              <Typography
                id="analysis-examples-title"
                variant="h6"
                component="h3"
                sx={{ fontWeight: 700 }}
              >
                {t('examplesTitle')}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {t('examplesDescription')}
              </Typography>
            </Box>
            {!searchText && (
              <Typography variant="body2">{t('examplesNoText')}</Typography>
            )}
            {isSearchingKnowledge && (
              <Typography role="status" variant="body2">
                {t('examplesSearching')}
              </Typography>
            )}
            {isKnowledgeSearchError && (
              <Alert
                severity="error"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => void refetchKnowledgeSearch()}
                  >
                    {t('examplesRetry')}
                  </Button>
                }
              >
                {aiErrorMessage(knowledgeSearchError, t('examplesError'))}
              </Alert>
            )}
            {knowledgeMatches && examples.length === 0 && (
              <Typography variant="body2">{t('examplesEmpty')}</Typography>
            )}
            {examples.map((entry) => (
              <Item key={entry.documentId}>
                <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {entry.documentName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t('exampleScore', {
                      percent: Math.round(entry.score * 100),
                    })}
                  </Typography>
                  <Typography variant="body2">{entry.content}</Typography>
                  <Button
                    size="small"
                    onClick={() => setExampleId(entry.documentId)}
                  >
                    {t('exampleOpen')}
                  </Button>
                </Stack>
              </Item>
            ))}
          </Stack>
        </Panel>
      </Layout>
      <Actions>
        <Box sx={{ mr: 'auto' }}>
          <StepBackButton to={routes.caseTab(item.id, caseTabs.request)} />
        </Box>
        {!readonly && (
          <Button
            variant="outlined"
            disabled={isSaving}
            onClick={() => void save(false)}
          >
            {t('save')}
          </Button>
        )}
        <Button
          variant="contained"
          disabled={isSaving}
          endIcon={<ArrowRight size={18} />}
          onClick={() => void save(true)}
        >
          {t(readonly ? 'viewMaterials' : 'continue')}
        </Button>
      </Actions>
      {exampleId && (
        <ExamplePreview id={exampleId} onClose={() => setExampleId(null)} />
      )}
    </Stack>
  )
}

export const AnalysisPage = () => {
  const item = useOutletContext<CaseItem>()
  return <AnalysisEditor key={item.id} item={item} />
}
