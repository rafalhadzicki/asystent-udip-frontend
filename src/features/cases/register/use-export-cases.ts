import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { getAllCases } from '@/api/cases/cases.api'
import type { CaseListParams } from '@/api/cases/cases.schemas'
import {
  caseInitials,
  csvCell,
  extensionDays,
  formatDate,
  urgencyTones,
} from './register-utils'

export const useExportCases = (
  filters: Omit<CaseListParams, 'limit' | 'offset'>,
) => {
  const { t } = useTranslation('translation', { keyPrefix: 'register' })
  const [isExporting, setIsExporting] = useState(false)
  const [exportError, setExportError] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const exportCsv = async () => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setExportError(false)
    setIsExporting(true)
    try {
      const items = await getAllCases(filters, controller.signal)
      const headers = [
        t('columns.ordinal'),
        t('columns.reference'),
        t('columns.subject'),
        t('columns.received'),
        t('columns.deadline'),
        t('columns.extension'),
        t('columns.responded'),
        t('columns.urgency'),
        t('columns.status'),
        t('columns.initials'),
      ]
      const lines = items.map((item) => [
        String(item.sequenceNumber),
        item.caseNumber,
        item.subject,
        formatDate(item.receivedAt),
        formatDate(item.effectiveDueAt),
        item.isExtended ? String(extensionDays(item)) : '',
        formatDate(item.respondedAt),
        t(`urgency.${urgencyTones[item.urgency]}`),
        t(`status.${item.status}`),
        caseInitials(item),
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
      if (axios.isCancel(error)) return
      console.error('Cannot export register', error)
      setExportError(true)
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null
        setIsExporting(false)
      }
    }
  }

  return {
    exportCsv,
    isExporting,
    exportError,
    dismissExportError: () => setExportError(false),
  }
}
