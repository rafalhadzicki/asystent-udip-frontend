import { render as renderView, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, AxiosHeaders } from 'axios'
import type { ReactNode } from 'react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { theme } from './app/theme'
import * as authApi from './features/auth/auth-api'

const render = (ui: ReactNode) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  return renderView(
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </ThemeProvider>,
  )
}

describe('App', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())
  it('wyświetla puste logowanie i informację o migracji', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Asystent UDIP' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveValue('')
    expect(screen.getByLabelText('Hasło')).toHaveValue('')
    expect(screen.getByText(/Logowanie korzysta z API/)).toBeInTheDocument()
  })

  it('wymaga loginu i hasła', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }))
    expect(await screen.findByText('Podaj adres e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Podaj hasło.')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveFocus()
  })

  it('przełącza widoczność hasła bez wysłania formularza', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('Hasło'), 'przykład')
    await user.click(screen.getByRole('button', { name: 'Pokaż hasło' }))
    expect(screen.getByLabelText('Hasło')).toHaveAttribute('type', 'text')
    await user.click(screen.getByRole('button', { name: 'Ukryj hasło' }))
    expect(screen.getByLabelText('Hasło')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Hasło')).toHaveValue('przykład')
    expect(screen.queryByText('Podaj adres e-mail.')).not.toBeInTheDocument()
  })

  it('odrzuca login składający się wyłącznie ze spacji', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('E-mail'), '   ')
    await user.type(screen.getByLabelText('Hasło'), 'demo123')
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }))
    expect(await screen.findByText('Podaj adres e-mail.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('pokazuje błąd, pozwala ponowić logowanie i wylogować się', async () => {
    const login = vi.spyOn(authApi, 'login')
    login.mockRejectedValueOnce(
      new AxiosError('Unauthorized', undefined, undefined, undefined, {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: {},
      }),
    )
    login.mockResolvedValueOnce({
      email: 'demo@example.com',
      accessToken: 'test-token',
    })
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('E-mail'), 'demo@example.com')
    await user.type(screen.getByLabelText('Hasło'), 'błędne')
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nieprawidłowy e-mail lub hasło.',
    )
    await user.clear(screen.getByLabelText('Hasło'))
    await user.type(screen.getByLabelText('Hasło'), 'demo123')
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }))
    expect(
      await screen.findByRole('heading', { name: 'Sprawy' }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Zalogowano · demo@example.com'),
    ).toBeInTheDocument()
    expect(login.mock.calls.at(-1)?.[0]).toEqual({
      email: 'demo@example.com',
      password: 'demo123',
    })
    expect(JSON.stringify(localStorage)).not.toContain('test-token')
    await user.click(screen.getByRole('button', { name: 'Wyloguj się' }))
    expect(screen.getByLabelText('Hasło')).toHaveValue('')
    expect(
      screen.getByRole('heading', { name: 'Asystent UDIP' }),
    ).toBeInTheDocument()
  })

  it('blokuje formularz podczas logowania', async () => {
    let finishLogin: (session: authApi.AuthSession) => void = () => {
      throw new Error('Login was not started')
    }
    vi.spyOn(authApi, 'login').mockImplementation(
      () =>
        new Promise((resolve) => {
          finishLogin = resolve
        }),
    )
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('E-mail'), 'demo@example.com')
    await user.type(screen.getByLabelText('Hasło'), 'example')
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }))
    expect(screen.getByRole('button', { name: 'Logowanie…' })).toBeDisabled()
    expect(screen.getByLabelText('E-mail')).toBeDisabled()
    finishLogin({ email: 'demo@example.com', accessToken: 'test-token' })
    expect(
      await screen.findByRole('heading', { name: 'Sprawy' }),
    ).toBeInTheDocument()
  })

  it('pokazuje błąd połączenia zamiast błędnych danych logowania', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue(
      new AxiosError('Network error'),
    )
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('E-mail'), 'demo@example.com')
    await user.type(screen.getByLabelText('Hasło'), 'example')
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nie udało się zalogować. Sprawdź połączenie z serwerem i spróbuj ponownie.',
    )
  })

  it('przekierowuje do logowania przy wejściu na sprawy bez sesji', () => {
    render(
      <MemoryRouter initialEntries={['/sprawy']}>
        <App />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: 'Asystent UDIP' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Wyloguj się' })).toBeNull()
  })

  it('pozwala wrócić ze strony o nieznanym adresie', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/nieznana']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Nie znaleziono strony' }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('link', { name: 'Wróć do strony głównej' }),
    )
    expect(
      screen.getByRole('heading', { name: 'Asystent UDIP' }),
    ).toBeInTheDocument()
  })
})
