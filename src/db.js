import pg from 'pg'
import { config } from './config.js'

const url = new URL(config.databaseUrl)
url.searchParams.delete('channel_binding')

export const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMilliseconds: 30000
})

// error handling
pool.on('error', (err) => {
  console.error('Unexpected database error:', err)
})
