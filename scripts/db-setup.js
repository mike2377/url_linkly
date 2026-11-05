import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const here = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.join(here, '..', 'src', 'db', 'schema.sql')

// skip DROP+CREATE if the liks table existand preserve data
const ifEmpty = process.argv.includes('--if-empty')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env')
  process.exit(1)
}

// retry, check if db is ready and avaible
async function connectWithRetry (connectionString, maxRetries = 30, delayMS = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    const client = new pg.Client({ connectionString })
    try {
      await client.connect()
      return client
    } catch (err) {
      console.log(`[db-setup] attempt ${i + 1}/${maxRetries} failed: ${err.message}`)
      try {
        await client.end()
      } catch {}
      if (i < maxRetries - 1) await new Promise((resolve) => setTimeout(resolve, delayMS))
    }
  }
  throw new Error(`Could not connect to the database after ${maxRetries} attempts`)
}

const client = await connectWithRetry(process.env.DATABASE_URL)

try {
  if (ifEmpty) {
    const check = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'links'
      )
    `)
    if (check.rows[0].exists) {
      console.log('[de-setup] schema already applied, skipping (--if-empty)')
      await client.end()
      process.exit(0)
    }
  }
  const sql = await readFile(schemaPath, 'utf8')
  await client.query(sql)
  console.log('Schema applied successfully')
} finally {
  await client.end()
}
