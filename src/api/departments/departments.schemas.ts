import { z } from 'zod'

export const departmentKindSchema = z.enum(['DEPARTMENT', 'OFFICE'])

export const departmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  symbol: z.string(),
  kind: departmentKindSchema,
  isActive: z.boolean(),
})

export const departmentListSchema = z.array(departmentSchema)

export type Department = z.infer<typeof departmentSchema>
