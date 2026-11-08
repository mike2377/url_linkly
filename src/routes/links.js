import { Router } from 'express'
import { createLinkSchema } from '../schemas/linkSchemas.js'
import { createLink, findLinkByCode, deleteLinkByCode } from '../services/linkService.js'
import { createRateLimiter } from '#src/middleware/rateLimit.js'
import { NotFoundError } from '../utils/errors.js'

export const linksRouter = Router()

const createLinkLimiter = createRateLimiter({ windowMs: 60_000, max: 100 })

// function one place to remove JSCPD for return POST and GET
function serialLink (link, req) {
  return {
    code: link.code,
    target_url: link.target_url,
    short_url: `${req.protocol}://${req.get('host')}/${link.code}`,
    created_at: link.created_at,
    expires_at: link.expires_at,
    click_count: link.click_count
  }
}

// POST /links - create link
linksRouter.post('/', createLinkLimiter, async (req, res) => {
  // Parse with Zod
  const data = createLinkSchema.parse(req.body)

  const link = await createLink({
    targetUrl: data.target_url,
    code: data.code,
    expiresAt: data.expires_at
  })

  // build short url
  res.status(201).json(serialLink(link, req))
})

// GET /links with code
linksRouter.get('/:code', async (req, res) => {
  const link = await findLinkByCode(req.params.code)
  if (!link) throw new NotFoundError('Link not found')

  res.json(serialLink(link, req))
})

// DELETE /links/:code = delete link and your clicks
linksRouter.delete('/:code', async (req, res) => {
  const deleted = await deleteLinkByCode(req.params.code)
  if (!deleted) throw new NotFoundError('Link not found')
  res.status(204).end()
})
