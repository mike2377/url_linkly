import pg from 'pg'
import { config } from './config.js'

const url = new URL(config.databaseUrl)
url.searchParams.delete('channel_binding')

// SSL is required for NEON not in local
const isLocal =
  url.hostname === 'localhost' ||
  url.hostname === '127.0.0.1' ||
  url.hostname === 'db' ||
  !url.hostname.includes('.')

export const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMilliseconds: 30000
})

// error handling
pool.on('error', (err) => {
  console.error('Unexpected database error:', err)
})
