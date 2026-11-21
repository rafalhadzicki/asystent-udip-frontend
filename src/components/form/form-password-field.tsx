import { IconButton, InputAdornment } from '@mui/material'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { type FieldPath, type FieldValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormTextField, type FormTextFieldProps } from './form-text-field'

type FormPasswordFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues>,
> = Omit<FormTextFieldProps<TValues, TName>, 'type' | 'slotProps'> & {
  slotProps?: Omit<
    NonNullable<FormTextFieldProps<TValues, TName>['slotProps']>,
    'input'
  >
}

export const FormPasswordField = <
  TValues extends FieldValues,
  TName extends FieldPath<TValues> = FieldPath<TValues>,
>({
  disabled,
  slotProps,
  ...props
}: FormPasswordFieldProps<TValues, TName>) => {
  const { t } = useTranslation('translation', { keyPrefix: 'form.password' })
  const [visible, setVisible] = useState(false)

  return (
    <FormTextField
      {...props}
      disabled={disabled}
      type={visible ? 'text' : 'password'}
      slotProps={{
        ...slotProps,
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                type="button"
                edge="end"
                disabled={disabled}
                aria-label={t(visible ? 'hide' : 'show')}
                aria-pressed={visible}
                onClick={() => setVisible((value) => !value)}
              >
                {visible ? (
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
  )
}
