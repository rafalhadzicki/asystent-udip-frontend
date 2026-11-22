import { z } from 'zod'

export const emailSchema = z.email()

export const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

export const userSchema = z.object({ id: z.uuid(), email: emailSchema })

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>
export type AuthSession = z.infer<typeof userSchema>
