import { Alert, Button, Typography } from '@mui/material'
import { ArrowRight, Landmark } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormPasswordField } from '@/components/form/form-password-field'
import { FormTextField } from '@/components/form/form-text-field'
import { useLogin } from '@/api/auth/auth.queries'
import { emailSchema } from '@/api/auth/auth.schemas'
import { getApiErrorKind } from '@/api/errors'
import { ScreenReaderText } from './screen-reader-text'
import {
  BrandIcon,
  LoginContainer,
  LoginFields,
  LoginForm,
  LoginHeader,
  LoginLayout,
} from './login-page.styles'

type LoginValues = {
  login: string
  password: string
}

export const LoginPage = () => {
  const { t } = useTranslation()
  const { t: authT } = useTranslation('translation', { keyPrefix: 'auth' })
  const { loginAsync, resetLogin } = useLogin()
  const {
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    defaultValues: { login: '', password: '' },
  })

  const onSubmit = async (values: LoginValues) => {
    clearErrors('root')
    try {
      await loginAsync({
        email: values.login.trim(),
        password: values.password,
      })
    } catch (error) {
      const invalid = getApiErrorKind(error) === 'unauthorized'
      setError('root', {
        message: authT(
          invalid ? 'errors.invalidCredentials' : 'errors.requestFailed',
        ),
      })
    } finally {
      resetLogin()
    }
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
            {t('app.organization')}
          </Typography>
          <Typography variant="h1" sx={{ mt: 1 }}>
            {t('app.name')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {t('app.description')}
          </Typography>
        </LoginHeader>

        <LoginForm
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          aria-label={authT('formLabel')}
          aria-busy={isSubmitting}
        >
          <LoginFields disabled={isSubmitting}>
            <ScreenReaderText as="legend">
              {authT('credentialsLegend')}
            </ScreenReaderText>
            <FormTextField
              control={control}
              name="login"
              rules={{
                required: authT('validation.loginRequired'),
                validate: (value) =>
                  value.trim().length === 0
                    ? authT('validation.loginRequired')
                    : emailSchema.safeParse(value.trim()).success ||
                      authT('validation.loginInvalid'),
              }}
              id="login"
              label={authT('loginLabel')}
              autoComplete="username"
              disabled={isSubmitting}
              slotProps={{
                htmlInput: {
                  autoCapitalize: 'none',
                  spellCheck: false,
                  'aria-required': true,
                },
              }}
            />
            <FormPasswordField
              control={control}
              name="password"
              rules={{ required: authT('validation.passwordRequired') }}
              id="password"
              label={authT('passwordLabel')}
              autoComplete="current-password"
              disabled={isSubmitting}
              slotProps={{
                htmlInput: { 'aria-required': true },
              }}
            />
            {errors.root && (
              <Alert severity="error">{errors.root.message}</Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              loading={isSubmitting}
              endIcon={
                isSubmitting ? undefined : <ArrowRight aria-hidden="true" />
              }
            >
              {authT(isSubmitting ? 'submitting' : 'submit')}
            </Button>
          </LoginFields>
          <ScreenReaderText role="status">
            {isSubmitting ? authT('submittingAnnouncement') : ''}
          </ScreenReaderText>
        </LoginForm>
      </LoginContainer>
    </LoginLayout>
  )
}
