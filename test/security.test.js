import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { api } from './helpers.js'
import { initTestDb, resetTestDb, closeTestDb } from './setup.js'
import { pool } from '../src/db.js'

before(async () => {
  await initTestDb()
})
beforeEach(async () => {
  await resetTestDb()
})
after(async () => {
  await closeTestDb()
})

test('SQL injection in target_url is stored as literal data, not executed', async () => {
  // payload for tes sql
  const payload = "https://example.com/';DROP TABLE links;--"

  const res = await api().post('/links').send({ target_url: payload })
  assert.equal(res.status, 201)

  // store payload
  const row = await pool.query('SELECT target_url FROM links WHERE code = $1', [res.body.code])
  assert.equal(row.rows[0].target_url, payload)

  // table always intact
  const count = await pool.query('SELECT COUNT(*)::int AS n FROM links')
  assert.equal(count.rows[0].n, 1)
})

test('SQL injection in code is rejected by Zod before reaching the DB', async () => {
  const res = await api().post('/links').send({
    target_url: 'https://example.com',
    code: "abc';DROP TABLE links;--"
  })
  assert.equal(res.status, 400)
  assert.equal(res.body.error, 'validation_error')

  const count = await pool.query('SELECT COUNT(*)::int AS n FROM links')
  assert.equal(count.rows[0].n, 0)
})

test('SQL metacharacters in :code return 404, not an error', async () => {
  const res = await api().get("/links/' OR '1'='1")
  assert.equal(res.status, 404)
  assert.equal(res.body.error, 'not_found')
})

test('javascript: URL is rejected', async () => {
  const res = await api().post('/links').send({ target_url: 'javascript:alert(1)' })
  assert.equal(res.status, 400)
})

test('data: URL is rejected', async () => {
  const res = await api().post('/links').send({ target_url: 'data:text/html,<script>alert(1)</script>' })
  assert.equal(res.status, 400)
})

test('file: URL is rejected', async () => {
  const res = await api().post('/links').send({ target_url: 'file:///etc/passwd' })
  assert.equal(res.status, 400)
})
