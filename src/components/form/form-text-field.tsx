import { TextField, type TextFieldProps } from '@mui/material'
import { useId } from 'react'
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
  type UseControllerProps,
} from 'react-hook-form'

type RhfManagedProps =
  | 'name'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'onBlur'
  | 'inputRef'
  | 'error'
  | 'select'

type MuiFieldProps = Omit<TextFieldProps, RhfManagedProps>

export type FormTextFieldProps<T extends FieldValues> = MuiFieldProps & {
  control: Control<T>
  name: FieldPath<T>
  rules?: UseControllerProps<T>['rules']
}

export const FormTextField = <T extends FieldValues>({
  control,
  name,
  rules,
  id,
  helperText,
  ...props
}: FormTextFieldProps<T>) => {
  const generatedId = useId()
  const { field, fieldState } = useController({ control, name, rules })

  return (
    <TextField
      {...props}
      id={id ?? generatedId}
      name={field.name}
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      inputRef={field.ref}
      error={Boolean(fieldState.error)}
      helperText={fieldState.error?.message ?? helperText}
    />
  )
}
