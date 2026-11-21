import { IconButton, InputAdornment, type TextFieldProps } from '@mui/material'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { type FieldValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FormTextField, type FormTextFieldProps } from './form-text-field'

type PasswordSlotProps = Omit<NonNullable<TextFieldProps['slotProps']>, 'input'>

type FormPasswordFieldProps<T extends FieldValues> = Omit<
  FormTextFieldProps<T>,
  'type' | 'slotProps'
> & {
  slotProps?: PasswordSlotProps
}

export const FormPasswordField = <T extends FieldValues>({
  disabled,
  slotProps,
  ...props
}: FormPasswordFieldProps<T>) => {
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
