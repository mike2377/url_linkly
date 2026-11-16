import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { pool } from '#src/db.js'

// not run if test is not explicite
if (process.env.NODE_ENV !== 'test') {
  throw new Error('Tests require MODE_ENV=test')
}
if (!process.env.TEST_DATABASE_URL) {
  throw new Error('Test require TEST_DATABASE_URL set in .env')
}

const here = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.join(here, '..', 'src', 'db', 'schema.sql')

// apply schema to test db
export async function initTestDb () {
  const sql = await readFile(schemaPath, 'utf8')
  await pool.query(sql)
}

// Clears data between tests
// RESTART IDENTITY allows for the retention of identifiers
export async function resetTestDb () {
  await pool.query('TRUNCATE clicks, links RESTART IDENTITY CASCADE')
}

// close pool
export async function closeTestDb () {
  await pool.end()
}
