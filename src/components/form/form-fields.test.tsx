import { Button } from '@mui/material'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { FormPasswordField } from './form-password-field'
import { FormTextField } from './form-text-field'

type Values = { profile: { email: string }; password: string }

const TestForm = ({
  onSubmit,
  disabled = false,
}: {
  onSubmit: (values: Values) => void
  disabled?: boolean
}) => {
  const { control, handleSubmit, reset } = useForm<Values>({
    mode: 'onBlur',
    defaultValues: { profile: { email: '' }, password: '' },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormTextField
        control={control}
        name="profile.email"
        label="Email"
        helperText="Pomoc"
        rules={{ required: 'Podaj email.' }}
        disabled={disabled}
      />
      <FormPasswordField
        control={control}
        name="password"
        label="Hasło"
        disabled={disabled}
      />
      <Button type="submit">Wyślij</Button>
      <Button type="button" onClick={() => reset()}>
        Reset
      </Button>
    </form>
  )
}

describe('wspólne pola formularzy', () => {
  it('obsługuje zagnieżdżone nazwy, onBlur, błędy, fokus i reset', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<TestForm onSubmit={onSubmit} />)
    const email = screen.getByLabelText('Email')

    expect(email).toHaveAccessibleDescription('Pomoc')
    await user.click(email)
    await user.tab()
    expect(await screen.findByText('Podaj email.')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription('Podaj email.')

    await user.click(screen.getByRole('button', { name: 'Wyślij' }))
    expect(email).toHaveFocus()
    expect(onSubmit).not.toHaveBeenCalled()

    await user.type(email, 'demo@example.test')
    await user.type(screen.getByLabelText('Hasło'), 'demo')
    await user.click(screen.getByRole('button', { name: 'Wyślij' }))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      profile: { email: 'demo@example.test' },
      password: 'demo',
    })

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(email).toHaveValue('')
    expect(screen.getByLabelText('Hasło')).toHaveValue('')
    expect(email).toHaveAccessibleDescription('Pomoc')
  })

  it('blokuje pole hasła oraz jego podgląd, gdy jest disabled', () => {
    render(<TestForm onSubmit={vi.fn()} disabled />)
    expect(screen.getByLabelText('Email')).toBeDisabled()
    expect(screen.getByLabelText('Hasło')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Pokaż hasło' })).toBeDisabled()
  })

  it('wbudowane loading MUI nie usuwa niezależnego disabled', () => {
    const { rerender } = render(
      <Button loading disabled>
        Wyślij
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Wyślij' })).toBeDisabled()
    rerender(
      <Button loading={false} disabled>
        Wyślij
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'Wyślij' })).toBeDisabled()
  })
})
