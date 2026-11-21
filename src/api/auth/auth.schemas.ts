import { z } from 'zod'

export const emailSchema = z.email()

export const loginCredentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
})

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
export type AuthSession = { email: string; accessToken: string }
