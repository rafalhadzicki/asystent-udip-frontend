import { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { logout } from '@/api/auth/auth.api'
import { getSession, setSession } from '@/api/session'
import { DemoProvider, useDemoStore } from '@/features/demo/demo-store'
import { AppLayout } from './app-layout'

const Draft = () => {
  const { uploadDraft, setUploadDraft } = useDemoStore()
  useEffect(() => {
    setUploadDraft({
      file: new File(['test'], 'test.pdf'),
      requestText: 'test',
      subject: '',
      applicant: '',
      receivedAt: '',
      writtenAt: '',
    })
  }, [setUploadDraft])
  return <div data-testid="draft">{uploadDraft ? 'present' : 'empty'}</div>
}

describe('AppLayout', () => {
  it('clears the in-memory upload draft on logout', async () => {
    const user = userEvent.setup()
    const session = { email: 'test@example.test', accessToken: 'token' }
    setSession(session)
    render(
      <MemoryRouter>
        <DemoProvider>
          <Draft />
          <AppLayout user={session} onLogout={logout} />
        </DemoProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('draft')).toHaveTextContent('present')
    await user.click(screen.getByRole('button', { name: 'Wyloguj się' }))
    expect(screen.getByTestId('draft')).toHaveTextContent('empty')
    expect(getSession()).toBeNull()
  })
})
