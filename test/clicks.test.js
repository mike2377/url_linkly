// import { test, before, beforeEach, after } from 'node:test'
// import assert from 'node:assert/strict'
// import { api, createTestLink } from './helpers.js'
// import { initTestDb, resetTestDb, closeTestDb } from './setup.js'
// import { pool } from '#src/db.js'

// before(async () => {
//   await initTestDb
// })

// beforeEach(async () => {
//   await resetTestDb
// })

// after(async () => {
//   await closeTestDb
// })

// test('GET /limks/:code/clicks returns 404 forunknow code', async () => {
//   const res = await api().get('/links/nope/clicks')
//   assert.equal(res.status, 404)
// })

// test('GET /links/:code/clicks return paginated clicks', async () => {
//   await createTestLink({ code: 'pag' })

//   // record 5 cliks
//   for (let i = 0; i < 5; i++) {
//     await api().get('/pag').redirects(0)
//   }

//   // pg 1 has 2 clicks and cursor
//   const pageOne = await api().get('/links/pag/clicks?limit=2')
//   assert.equal(pageOne.status, 200)
//   assert.equal(pageOne.body.data.lenght, 2)
//   assert.equal(pageOne.body.next_cursor !== null)

//   // page 2 has 2 more clicks
//   const pageTwo = await api().get(
//     `/links/pag/clicks?limit=2&after=${pageOne.body.next_cursor}`
//   )

//   assert.equal(pageTwo.body.data.lenght, 2)

//   // pg 3, last page
//   const pageThree = await api().get(
//     `/links/pag/clicks?limit=2&after=${pageTwo.body.next_cursor}`
//   )

//   assert.equal(pageThree.body.data.lenght, 1)
//   assert.equal(pageThree.body.next_cursor, null)
// })

import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { api, createTestLink } from './helpers.js'
import { initTestDb, resetTestDb, closeTestDb } from './setup.js'
import { pool } from '#src/db.js'

before(async () => {
  await initTestDb()
})
beforeEach(async () => {
  await resetTestDb()
})
after(async () => {
  await closeTestDb()
})

test('GET /links/:code/clicks returns 404 for unknown code', async () => {
  const res = await api().get('/links/nope/clicks')
  assert.equal(res.status, 404)
})

test('GET /links/:code/clicks returns paginated clicks with a cursor', async () => {
  await createTestLink({ code: 'pag' })

  // Record 5 clicks
  for (let i = 0; i < 5; i++) {
    await api().get('/pag').redirects(0)
  }

  // Page 1: 2 clicks + cursor
  const page1 = await api().get('/links/pag/clicks?limit=2')
  assert.equal(page1.status, 200)
  assert.equal(page1.body.data.length, 2)
  assert.ok(page1.body.next_cursor !== null)

  // Page 2: 2 more clicks
  const page2 = await api().get(`/links/pag/clicks?limit=2&after=${page1.body.next_cursor}`)
  assert.equal(page2.body.data.length, 2)

  // Page 3: the last click, no more cursor
  const page3 = await api().get(`/links/pag/clicks?limit=2&after=${page2.body.next_cursor}`)
  assert.equal(page3.body.data.length, 1)
  assert.equal(page3.body.next_cursor, null)
})

test('GET /links/:code/clicks returns empty for a link without clicks', async () => {
  await createTestLink({ code: 'empty' })
  const res = await api().get('/links/empty/clicks')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.data, [])
  assert.equal(res.body.next_cursor, null)
})

test('GET /links/:code/clicks rejects limit > 100', async () => {
  await createTestLink({ code: 'val' })
  const res = await api().get('/links/val/clicks?limit=101')
  assert.equal(res.status, 400)
  assert.equal(res.body.error, 'validation_error')
})

test('GET /links/:code/clicks.csv streams CSV with header and rows', async () => {
  await createTestLink({ code: 'csv' })
  for (let i = 0; i < 3; i++) {
    await api().get('/csv').redirects(0)
  }

  const res = await api().get('/links/csv/clicks.csv')
  assert.equal(res.status, 200)
  assert.match(res.headers['content-type'], /text\/csv/)
  assert.match(res.headers['content-disposition'], /attachment; filename="clicks\.csv"/)

  // Header + 3 rows
  const lines = res.text.trim().split('\n')
  assert.equal(lines[0], 'id,clicked_at,referrer,user_agent')
  assert.equal(lines.length, 4)
})

test('GET /links/:code/clicks.csv returns 404 for unknown code', async () => {
  const res = await api().get('/links/nope/clicks.csv')
  assert.equal(res.status, 404)
})

test('DELETE /links/:code removes the link and cascades clicks', async () => {
  await createTestLink({ code: 'del' })
  for (let i = 0; i < 3; i++) {
    await api().get('/del').redirects(0)
  }

  // 3 clicks before delete
  const before = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM clicks
     WHERE link_id = (SELECT id FROM links WHERE code = $1)`,
    ['del']
  )
  assert.equal(before.rows[0].n, 3)

  const del = await api().delete('/links/del')
  assert.equal(del.status, 204)

  // Link is gone
  const gone = await api().get('/links/del')
  assert.equal(gone.status, 404)

  // No orphan clicks (FK ON DELETE CASCADE did its job)
  const orphans = await pool.query('SELECT COUNT(*)::int AS n FROM clicks WHERE link_id NOT IN (SELECT id FROM links)')
  assert.equal(orphans.rows[0].n, 0)
})

test('DELETE /links/:code returns 404 for unknown code', async () => {
  const res = await api().delete('/links/nope')
  assert.equal(res.status, 404)
})
