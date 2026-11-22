import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { logout } from '@/api/auth/auth.api'
import { getSession, setSession } from '@/api/session'
import { LocalStoreProvider, useLocalStore } from '@/features/cases/local-store'
import { AppLayout } from './app-layout'

const Draft = () => {
  const { uploadDraft, setUploadDraft } = useLocalStore()
  return (
    <>
      <button
        onClick={() =>
          setUploadDraft({
            file: new File(['test'], 'test.pdf'),
            requestText: 'test',
            subject: '',
            applicant: '',
            receivedAt: '',
            writtenAt: '',
            applicantEmail: '',
            applicantAddress: '',
            questions: [],
            departments: [],
            aiStatus: 'NOT_CONFIGURED',
          })
        }
      >
        seed
      </button>
      <div data-testid="draft">{uploadDraft ? 'present' : 'empty'}</div>
    </>
  )
}

describe('AppLayout', () => {
  it('clears the in-memory upload draft on logout', async () => {
    const user = userEvent.setup()
    const session = {
      id: '3f0c1d2e-5a4b-4c6d-8e7f-9a0b1c2d3e4f',
      email: 'test@example.test',
    }
    setSession(session)
    render(
      <MemoryRouter>
        <LocalStoreProvider>
          <Draft />
          <AppLayout user={session} onLogout={logout} />
        </LocalStoreProvider>
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'seed' }))
    expect(screen.getByTestId('draft')).toHaveTextContent('present')
    await user.click(screen.getByRole('button', { name: 'Wyloguj się' }))
    expect(screen.getByTestId('draft')).toHaveTextContent('empty')
    expect(getSession()).toBeNull()
  })
})
