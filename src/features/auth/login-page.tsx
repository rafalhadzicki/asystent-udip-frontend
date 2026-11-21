import {
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material'
import { ArrowRight, Circle, Eye, EyeOff, Landmark } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  BrandIcon,
  DemoChip,
  LoginContainer,
  LoginFields,
  LoginFooter,
  LoginForm,
  LoginHeader,
  LoginLayout,
  ScreenReaderText,
  SubmitButton,
} from './login-page.styles'
import { demoCredentials, mockLogin, type DemoUser } from './mock-auth'

type LoginValues = {
  login: string
  password: string
}

export const LoginPage = ({
  onLogin,
}: {
  onLogin: (user: DemoUser) => void
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    defaultValues: { login: '', password: '' },
  })

  const { ref: loginRef, ...loginField } = register('login', {
    required: 'Podaj login.',
    validate: (value) => value.trim().length > 0 || 'Podaj login.',
  })
  const { ref: passwordRef, ...passwordField } = register('password', {
    required: 'Podaj hasło.',
  })

  const onSubmit = async (values: LoginValues) => {
    clearErrors('root')
    const result = await mockLogin(values.login, values.password)
    if (!result.ok) {
      setError('root', { message: result.message })
      return
    }
    onLogin(result.user)
  }

  return (
    <LoginLayout>
      <LoginContainer>
        <LoginHeader>
          <BrandIcon>
            <Landmark aria-hidden="true" />
          </BrandIcon>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ letterSpacing: '0.1em' }}
          >
            Urząd Miasta Bydgoszczy
          </Typography>
          <Typography variant="h1" sx={{ mt: 1 }}>
            Asystent UDIP
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            Obsługa wniosków o dostęp do informacji publicznej
          </Typography>
          <DemoChip
            icon={<Circle fill="currentColor" aria-hidden="true" />}
            label="Wersja demonstracyjna"
            size="small"
          />
        </LoginHeader>

        <LoginForm
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          aria-label="Logowanie"
          aria-busy={isSubmitting}
        >
          <LoginFields disabled={isSubmitting}>
            <ScreenReaderText as="legend">Dane logowania</ScreenReaderText>
            <TextField
              {...loginField}
              inputRef={loginRef}
              id="login"
              label="Login"
              autoComplete="username"
              disabled={isSubmitting}
              error={Boolean(errors.login)}
              helperText={errors.login?.message}
              slotProps={{
                htmlInput: {
                  autoCapitalize: 'none',
                  spellCheck: false,
                  'aria-required': true,
                },
              }}
            />
            <TextField
              {...passwordField}
              inputRef={passwordRef}
              id="password"
              label="Hasło"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isSubmitting}
              error={Boolean(errors.password)}
              helperText={errors.password?.message}
              slotProps={{
                htmlInput: { 'aria-required': true },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        edge="end"
                        disabled={isSubmitting}
                        aria-label={
                          showPassword ? 'Ukryj hasło' : 'Pokaż hasło'
                        }
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((value) => !value)}
                      >
                        {showPassword ? (
                          <EyeOff size={20} aria-hidden="true" />
                        ) : (
                          <Eye size={20} aria-hidden="true" />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {errors.root && (
              <Alert severity="error">{errors.root.message}</Alert>
            )}
            <SubmitButton
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting}
              endIcon={
                isSubmitting ? undefined : <ArrowRight aria-hidden="true" />
              }
              startIcon={
                isSubmitting ? (
                  <CircularProgress
                    size={18}
                    color="inherit"
                    aria-hidden="true"
                  />
                ) : undefined
              }
            >
              {isSubmitting ? 'Logowanie…' : 'Zaloguj się'}
            </SubmitButton>
          </LoginFields>
          <ScreenReaderText role="status">
            {isSubmitting ? 'Trwa logowanie.' : ''}
          </ScreenReaderText>
        </LoginForm>

        <LoginFooter>
          <Typography variant="body2">
            Konto testowe: <code>{demoCredentials.login}</code> /{' '}
            <code>{demoCredentials.password}</code>
          </Typography>
          <Typography variant="caption" component="p" sx={{ mt: 1 }}>
            Logowanie jest symulowane. Nie wpisuj rzeczywistych danych.
            <br />
            Odświeżenie strony kończy sesję demonstracyjną.
          </Typography>
        </LoginFooter>
      </LoginContainer>
    </LoginLayout>
  )
}
