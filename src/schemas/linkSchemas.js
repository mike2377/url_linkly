import { z } from 'zod'

// specification: 3-16 chars, alnum + underscore + hyphen
const CODE_PATTERN = /^[A-Za-z0-9_-]{3,16}$/

export const createLinkSchema = z.object({
  target_url: z
    .string()
    .url('Must be a valid URL')
    .refine((url) => url.startsWith('http://') || url.startsWith('https://'), { message: 'URL must use http or https' }),
  code: z.string().regex(CODE_PATTERN, 'Code must be 3-16 chars: A-Z, a-z, 0-9, _, -').optional(),
  expires_at: z.string().datetime({ offset: true }).optional()
})
