import { z } from 'zod'

export const loginCredentialsSchema = z.object({
  email: z.string(),
  password: z.string(),
})

export const loginResponseSchema = z.object({
  accessToken: z.string().min(1),
})

export type LoginCredentials = z.infer<typeof loginCredentialsSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
export type AuthSession = { email: string; accessToken: string }
