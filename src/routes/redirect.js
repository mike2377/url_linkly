import { Router } from 'express'
import { findLinkByCode } from '../services/linkService.js'
import { recordClick } from '../services/clickService.js'
import { NotFoundError, GoneError } from '../utils/errors.js'

export const redirectRouter = Router()

// GETT /:code, redirect to target URL and record clicks
redirectRouter.get('/:code', async (req, res) => {
  const link = await findLinkByCode(req.params.code)

  // unknow code = 404
  if (!link) throw new NotFoundError('limk not found')

  // expire = 410 Gone
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    throw new GoneError('link expire')
  }

  // record before redirect
  await recordClick(link.id, {
    referrer: req.get('referer'),
    userAgent: req.get('user-agent')
  })

  // link expire or delete, client re-check = 302
  res.redirect(302, link.target_url)
})
