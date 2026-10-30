import { Router } from 'express'
import { createLinkSchema } from '../schemas/linkSchemas.js'
import { createLink, findLinkByCode } from '../services/linkService.js'
import { NotFoundError } from '../utils/errors.js'

export const linksRouter = Router()

// POST /links - create link
linksRouter.post('/', async (req, res) => {
  // Parse with Zod
  const data = createLinkSchema.parse(req.body)

  const link = await createLink({
    targetUrl: data.target_url,
    code: data.code,
    expiresAt: data.expires_at
  })

  // build short url
  res.status(201).json({
    code: link.code,
    target_url: link.target_url,
    short_url: `${req.protocol}://${req.get('host')}/${link.code}`,
    created_at: link.created_at,
    expires_at: link.expires_at,
    click_count: link.click_count
  })
})

// GET /links with code
linksRouter.get('/:code', async (req, res) => {
  const link = await findLinkByCode(req.params.code)
  if (!link) throw new NotFoundError('Link not found')

  res.json({
    code: link.code,
    target_url: link.target_url,
    created_at: link.created_at,
    expires_at: link.expires_at,
    click_count: link.click_count
  })
})
