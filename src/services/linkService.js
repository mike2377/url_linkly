import { pool } from '#src/db.js'
import { generateCode } from '#src/utils/code.js'
import { ConflictError } from '#src/utils/errors.js'

const MAX_RETRIES = 5

// create link if code is provides, otherwise generate random codes and retry on collision
export async function createLink({ targetUrl, code, expiresAt }) {
  if (code) {
    const result = await insertLink({ targetUrl, code, expiresAt })
    if (result.conflict) {
      throw new ConflictError(`Code "${code}" is already taken`)
    }
    return result.link
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const randomCode = generateCode()
    const result = await insertLink({ targetUrl, code: randomCode, expiresAt })
    if (!result.conflict) return result.link
  }

  throw new Error('Failed to generate a unique code after multiple attempts')
}

// INSERT, sql queries are parameterized to prevent sql injection, if code is taken, postgresql returns unique_violation (23505)
async function insertLink({ targetUrl, code, expiresAt }) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO links (code, target_url, expires_at)
       VALUES ($1, $2, $3)
       RETURNING id, code, target_url, created_at, expires_at, click_count`,
      [code, targetUrl, expiresAt ?? null]
    )
    return { link: rows[0] }
  } catch (err) {
    if (err.code === '23505') return { conflict: true }
    throw err
  }
}

// retrieve link by code
export async function findLinkByCode(code) {
  const { rows } = await pool.query(
    `SELECT id, code, target_url, created_at, expires_at, click_count
     FROM links
     WHERE code = $1`,
    [code]
  )
  return rows[0] ?? null
}
