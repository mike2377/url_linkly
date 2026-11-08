import { Router } from 'express'
import { clicksQuerySchema } from '../schemas/clickSchemas.js'
import { findLinkByCode } from '../services/linkService.js'
import { listClickForLink, streamClickCsv } from '../services/clickService.js'
import { NotFoundError } from '../utils/errors.js'

export const clicksRouter = Router()

// GET /LINKS/:code/clicks.csv = stream export
clicksRouter.get('/:code/clicks.csv', async (req, res) => {
  const link = await findLinkByCode(req.params.code)
  if (!link) throw new NotFoundError('Link not found')
  await streamClickCsv(link.id, res)
})

// GET /LINKS/:code/clicks?after=&limit=
clicksRouter.get('/:code/clicks', async (req, res) => {
  const { after, limit } = clicksQuerySchema.parse(req.query)

  const link = await findLinkByCode(req.params.code)
  if (!link) throw new NotFoundError('Link not found')

  const result = await listClickForLink(link.id, { after, limit })
  res.json(result)
})
