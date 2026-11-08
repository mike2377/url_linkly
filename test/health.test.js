import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { api } from './helpers.js'
import { initTestDb, closeTestDb } from './setup.js'

before(async () => {
  await initTestDb()
})
after(async () => {
  await closeTestDb()
})

test('GET /health returns 200 when database reachable', async () => {
  const res = await api().get('/health')
  assert.equal(res.status, 200)
  assert.equal(res.body.status, 'ok')
  assert.equal(res.body.database, 'ok')
})
