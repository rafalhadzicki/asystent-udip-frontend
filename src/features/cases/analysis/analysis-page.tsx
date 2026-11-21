import { Layout, Item, Actions } from './analysis-page.styles'
import { SectionCard as Panel } from '@/components/ui/section-card'
import { selectedDepartments, selectedQuestions } from './analysis-utils'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import { useDemoStore } from '@/features/demo/demo-store'
import { caseTabs, routes } from '@/app/routes'
import type {
  CaseItem,
  Department,
  KnowledgeItem,
  Question,
} from '@/features/demo/types'

const newId = () => globalThis.crypto.randomUUID()

const AnalysisEditor = ({ item }: { item: CaseItem }) => {
  const { t } = useTranslation('translation', { keyPrefix: 'analysis' })
  const { knowledge, updateCase } = useDemoStore()
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
  const [example, setExample] = useState<KnowledgeItem | null>(null)
  const readonly = item.status === 'completed'
  const departmentsChanged =
    JSON.stringify(selectedDepartments(departments)) !==
    JSON.stringify(selectedDepartments(item.departments))
  const changedScope =
    JSON.stringify(selectedQuestions(questions)) !==
      JSON.stringify(selectedQuestions(item.questions)) || departmentsChanged
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
  const examples = knowledge.filter((entry) => entry.category === 'response')

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
    setDepartments((current) => [
      ...current,
      { id: newId(), name, reason: departmentReason.trim(), selected: true },
    ])
    setDepartmentName('')
    setDepartmentReason('')
    setDepartmentError('')
    setMessage('')
  }
  const save = (continueToMaterials: boolean) => {
    if (readonly) {
      if (continueToMaterials)
        navigate(routes.caseTab(item.id, caseTabs.materials))
      return
    }
    if (continueToMaterials || item.analysisNeedsReview) {
      setAttemptedContinue(true)
      if (questionsInvalid || departmentsInvalid) return
    }
    const changes: Partial<CaseItem> = {
      questions,
      departments,
      analysisNeedsReview: false,
      ...(departmentsChanged ? { contactedAt: '' } : {}),
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
      <Alert severity="info">{t('simulation')}</Alert>
      {item.analysisNeedsReview && (
        <Alert severity="warning">{t('reviewRequired')}</Alert>
      )}
      {readonly && <Alert severity="info">{t('readonly')}</Alert>}
      {invalidatesDraft && !readonly && (
        <Alert severity="warning">{t('invalidationWarning')}</Alert>
      )}
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
                    helperText={departmentError}
                    onChange={(event) => {
                      setDepartmentName(event.target.value)
                      setDepartmentError('')
                    }}
                  />
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
            {examples.length === 0 && (
              <Typography variant="body2">{t('examplesEmpty')}</Typography>
            )}
            {examples.map((entry) => (
              <Item key={entry.id}>
                <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
                  <Typography sx={{ fontWeight: 600 }}>{entry.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {entry.description || t('exampleNoDescription')}
                  </Typography>
                  <Button size="small" onClick={() => setExample(entry)}>
                    {t('exampleOpen')}
                  </Button>
                </Stack>
              </Item>
            ))}
          </Stack>
        </Panel>
      </Layout>
      <Actions>
        {!readonly && (
          <Button variant="outlined" onClick={() => save(false)}>
            {t('save')}
          </Button>
        )}
        <Button
          variant="contained"
          endIcon={<ArrowRight size={18} />}
          onClick={() => save(true)}
        >
          {t(readonly ? 'viewMaterials' : 'continue')}
        </Button>
      </Actions>
      <Dialog
        open={Boolean(example)}
        onClose={() => setExample(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{t('exampleDialogTitle')}</DialogTitle>
        <DialogContent>
          {example && (
            <Stack spacing={1}>
              <Typography sx={{ fontWeight: 700 }}>{example.name}</Typography>
              <Typography>
                {example.description || t('exampleNoDescription')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('exampleFile', { name: example.fileName })}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {t('exampleDate', { date: example.updatedAt })}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExample(null)}>{t('close')}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export const AnalysisPage = () => {
  const item = useOutletContext<CaseItem>()
  return <AnalysisEditor key={item.id} item={item} />
}
