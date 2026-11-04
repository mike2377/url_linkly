import { pool } from '../db.js'
import { NotFoundError } from '../utils/errors.js'
import { writeCsvHeader, writeCsvRow } from '../utils/csv.js'

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

// pagination
export async function listClickForLink(linkId, { after, limit }) {
  // zod limit validation 1 to 100
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`listClick require limit greater than 1, ${limit}`)
  }

  const { rows } = await pool.query(
    `SELECT id, clicked_at, referrer, user_agent
    FROM clicks
    WHERE link_id = $1
      AND ($2::int IS NULL OR id < $2)
    ORDER BY id DESC
    LIMIT $3`,
    [linkId, after ?? null, limit + 1]
  )

  const hasMore = rows.length > limit
  const data = hasMore ? rows.slice(0, limit) : rows
  const nextCursor = hasMore ? data[data.length - 1].id : null

  return { data, next_cursor: nextCursor }
}

// streams the full click loadind in memoriy
export async function streamClickCsv(linkId, res) {
  writeCsvHeader(res, ['id', 'clicked_at', 'referrer', 'user_agent'], 'clicks.csv')

  const BATCH = 1000
  let after = null

  while (true) {
    const { rows } = await pool.query(
      `SELECT id, clicked_at, referrer, user_agent
      FROM clicks
      WHERE link_id = $1 AND ($2::int IS NULL OR id < $2)
      ORDER BY id DESC LIMIT $3`,
      [linkId, after, BATCH]
    )

    if (rows.length === 0) break

    for (const row of rows) {
      writeCsvRow(res, [row.id, row.clicked_at.toISOString(), row.referrer, row.user_agent])
    }

    after = rows[rows.length - 1].id
    if (rows.length < BATCH) break
  }

  res.end()
}
