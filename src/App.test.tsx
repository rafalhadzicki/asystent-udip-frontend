import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('wyświetla puste logowanie z informacją o mockach', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Asystent UDIP' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Login')).toHaveValue('')
    expect(screen.getByLabelText('Hasło')).toHaveValue('')
    expect(screen.getByText(/Logowanie jest symulowane/)).toBeInTheDocument()
    expect(screen.getByText('demo', { selector: 'code' })).toBeInTheDocument()
    expect(
      screen.getByText('demo123', { selector: 'code' }),
    ).toBeInTheDocument()
  })

  it('wymaga loginu i hasła', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }))
    expect(await screen.findByText('Podaj login.')).toBeInTheDocument()
    expect(screen.getByText('Podaj hasło.')).toBeInTheDocument()
    expect(screen.getByLabelText('Login')).toHaveFocus()
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
    expect(screen.queryByText('Podaj login.')).not.toBeInTheDocument()
  })

  it('odrzuca login składający się wyłącznie ze spacji', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('Login'), '   ')
    await user.type(screen.getByLabelText('Hasło'), 'demo123')
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }))
    expect(await screen.findByText('Podaj login.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('pokazuje błąd, pozwala ponowić logowanie i wylogować się', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('Login'), 'demo')
    await user.type(screen.getByLabelText('Hasło'), 'błędne')
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }))
    expect(screen.getByRole('button', { name: 'Logowanie…' })).toBeDisabled()
    expect(screen.getByLabelText('Login')).toBeDisabled()
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nieprawidłowy login lub hasło.',
    )
    await user.clear(screen.getByLabelText('Hasło'))
    await user.type(screen.getByLabelText('Hasło'), 'demo123')
    await user.click(screen.getByRole('button', { name: 'Zaloguj się' }))
    expect(
      await screen.findByRole('heading', { name: 'Sprawy' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Sesja demonstracyjna · Urzędnik demonstracyjny'),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Wyloguj się' }))
    expect(screen.getByLabelText('Hasło')).toHaveValue('')
    expect(
      screen.getByRole('heading', { name: 'Asystent UDIP' }),
    ).toBeInTheDocument()
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
