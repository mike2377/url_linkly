import { pool } from '../db.js'
import { NotFoundError } from '../utils/errors.js'

// count click and record
export async function recordClick(linkId, { referrer, userAgent }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // increment the count client and update to db
    const result = await client.query('UPDATE links SET click_count = click_count + 1 WHERE id = $1', [linkId])

    // the link delete betwen findLinkbyCode and here and roll back click row orpan
    if (result.rowCount === 0) {
      await client.query('ROLLBACK')
      throw new NotFoundError('link no longer exists')
    }

    await client.query('INSERT INTO clicks (link_id, referrer, user_agent) VALUES ($1, $2, $3)', [
      linkId,
      referrer ?? null,
      userAgent ?? null
    ])

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
