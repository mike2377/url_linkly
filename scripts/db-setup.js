import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const here = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.join(here, '..', 'src', 'db', 'schema.sql')

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set in .env')
  process.exit(1)
}

const sql = await readFile(schemaPath, 'utf8')
const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

await client.connect()
try {
  await client.query(sql)
  console.log('Schema applied successfully')
} finally {
  await client.end()
}
