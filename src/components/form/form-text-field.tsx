import { TextField, type TextFieldProps } from '@mui/material'
import { useId } from 'react'
import {
  useController,
  type FieldPath,
  type FieldValues,
  type UseControllerProps,
} from 'react-hook-form'

export type FormTextFieldProps<
  TValues extends FieldValues,
  TName extends FieldPath<TValues> = FieldPath<TValues>,
> = Omit<
  TextFieldProps,
  | 'name'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'onBlur'
  | 'inputRef'
  | 'error'
  | 'select'
> &
  Pick<UseControllerProps<TValues, TName>, 'control' | 'name' | 'rules'>

export const FormTextField = <
  TValues extends FieldValues,
  TName extends FieldPath<TValues> = FieldPath<TValues>,
>({
  control,
  name,
  rules,
  id,
  helperText,
  ...props
}: FormTextFieldProps<TValues, TName>) => {
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
