import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { clearSession } from '@/api/session'
import '../i18n'

afterEach(() => {
  cleanup()
  clearSession()
})
