import { positive, z } from 'zod'

// params for click log

export const clicksQuerySchemas = z.object({
  // coerce convert params to number
  after: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().max(100).default(20)
})
