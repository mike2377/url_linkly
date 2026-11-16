import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { healthRouter } from './routes/health.js'
import { linksRouter } from './routes/links.js'
import { clicksRouter } from './routes/clicks.js'
import { redirectRouter } from './routes/redirect.js'
import { errorHandler } from './middleware/errorHandler.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const openapiSpec = JSON.parse(readFileSync(path.join(here, 'docs', 'openapi.json'), 'utf-8'))

export function createApp () {
  const app = express()
  app.set('trust proxy', 1)

  // parse json request body
  app.use(express.json({ limit: '16kb' }))

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec))

  // Routes
  app.use('/health', healthRouter)
  app.use('/links', linksRouter)
  app.use('/links', clicksRouter)
  app.use('/', redirectRouter)

  app.get('/', (req, res) => {
    res.json({
      name: 'linkly API',
      status: 'running',
      docs: '/docs',
      health: '/health'
    })
  })

  // Catch unmatched routes
  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', message: 'Route not found' })
  })

  // Global error handler
  app.use(errorHandler)

  return app
}
