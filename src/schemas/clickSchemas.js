import { z } from 'zod'

// params for click log

export const clicksQuerySchema = z.object({
  // coerce convert params to number
  after: z.coerce.number().int().positive().optional(),
  // limit, 1 too 100
  limit: z.coerce.number().int().min(1).max(100).default(20)
})
