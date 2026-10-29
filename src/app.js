import express from 'express'
import { healthRouter } from './routes/health.js'
import { linksRouter } from './routes/links.js'
import { errorHandler } from './middleware/errorHandler.js'

export function createApp() {
  const app = express()

  // parse json request body
  app.use(express.json({ limit: '16kb' }))

  // Routes
  app.use('/health', healthRouter)
  app.use('/links', linksRouter)

  // Catch unmatched routes
  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', message: 'Route not found' })
  })

  // Global error handler
  app.use(errorHandler)

  return app
}
