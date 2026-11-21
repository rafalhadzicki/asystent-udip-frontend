import { Alert, Button, Typography } from '@mui/material'
import { ArrowRight, Circle, Landmark } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { FormPasswordField } from '@/components/form/form-password-field'
import { FormTextField } from '@/components/form/form-text-field'
import { ScreenReaderText } from './screen-reader-text'
import {
  BrandIcon,
  DemoChip,
  LoginContainer,
  LoginFields,
  LoginFooter,
  LoginForm,
  LoginHeader,
  LoginLayout,
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
  const { t } = useTranslation()
  const { t: authT } = useTranslation('translation', { keyPrefix: 'auth' })
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
    const result = await mockLogin(values.login, values.password)
    if (!result.ok) {
      setError('root', { message: authT(`errors.${result.code}`) })
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
            {t('app.organization')}
          </Typography>
          <Typography variant="h1" sx={{ mt: 1 }}>
            {t('app.name')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {t('app.description')}
          </Typography>
          <DemoChip
            icon={<Circle fill="currentColor" aria-hidden="true" />}
            label={t('app.demoVersion')}
            size="small"
          />
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
                  value.trim().length > 0 || authT('validation.loginRequired'),
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

        <LoginFooter>
          <Typography variant="body2">
            <Trans
              i18nKey="auth.demo.credentials"
              values={demoCredentials}
              components={{ login: <code />, password: <code /> }}
            />
          </Typography>
          <Typography variant="caption" component="p" sx={{ mt: 1 }}>
            {authT('demo.notice')}
            <br />
            {authT('demo.sessionNotice')}
          </Typography>
        </LoginFooter>
      </LoginContainer>
    </LoginLayout>
  )
}
