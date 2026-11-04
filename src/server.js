import { createApp } from './app.js'
import { config } from './config.js'
import { pool } from './db.js'

const app = createApp()

const server = app.listen(config.port, () => {
  console.log(`Linkly listening on http://localhost:${config.port} (${config.nodeEnv})`)
})

// Graceful shutdown: stop accepting requests, close the pool, exit
async function shutdown (signal) {
  console.log(`\n${signal} received, shutting down...`)
  server.close(async () => {
    await pool.end()
    console.log('Server closed')
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
