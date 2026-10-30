import pg from 'pg'
import { config } from './config.js'

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMilliseconds: 30000
})

// error handling
pool.on('error', (err) => {
  console.error('Unexpected database error:', err)
})
