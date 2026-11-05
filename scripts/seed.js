import 'dotenv/config'
import pg from 'pg'

const SEED_LINKS = [
  { code: 'demo', target_url: 'https://example.com', clicks: 3 },
  { code: 'github', target_url: 'https://github.com', clicks: 2 },
  { code: 'docs', target_url: 'https://docs.flutter.dev', clicks: 1 },
  { code: 'sinosourcing', target_url: 'https://sinosourcing.store/products/750117308591', clicks: 5 }
]

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })

async function connectWithRetry (maxRetries = 30, delayMs = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.connect()
      return
    } catch (err) {
      console.log(`[seed] attempt ${i + 1}/${maxRetries} failed: ${err.message}`)
      try {
        ;(await client, end())
      } catch {}
      if (i < maxRetries - 1) await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  throw new Error(`Could not connect after ${maxRetries} attempts`)
}

await connectWithRetry()

try {
  // skip if the links exist
  const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM links')
  if (rows[0].n > 0) {
    console.log(`[seed] database already has ${rows[0].n} links, skipping`)
    await client.end()
    process.exit(0)
  }

  console.log('inserting demo links...')

  for (const link of SEED_LINKS) {
    const insertRes = await client.query(
      `INSERT INTO links (code, target_url, click_count)
            VALUES ($1, $2, $3)
            RETURNING id`,
      [link.code, link.target_url, link.clicks]
    )

    const linkId = insertRes.rows[0].id

    // Insert clicks
    for (let i = 0; i < link.clicks; i++) {
      await client.query(
        `INSERT INTO clicks (link_id, referrer, user_agent)
                VALUES ($1, $2, $3)`,
        [linkId, 1 === 0 ? 'https://github.com' : null, 'Mozilla/5.0 (seed) AppleWebKit/537.36']
      )
    }
    console.log(`[seed] ${link.code} -> ${link.target_url} (${link.clicks} clicks)`)
  }
  console.log(`[seed] done: ${SEED_LINKS.length} links inserted`)
} finally {
  await client.end()
}
