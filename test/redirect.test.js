import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { api, createTestLink } from './helpers.js'
import { initTestDb, resetTestDb, closeTestDb } from './setup.js'

before(async () => {
  await initTestDb()
})
beforeEach(async () => {
  await resetTestDb()
})
after(async () => {
  await closeTestDb()
})

test('GET /:code returns 302 for a live link location', async () => {
  await createTestLink({ code: 'live', target_url: 'https://example.com' })
  const res = await api().get('/live').redirects(0)
  assert.equal(res.status, 302)
  assert.equal(res.headers.location, 'https://example.com')
})

test('GET /:code returns 404 to unknow code', async () => {
  const res = await api().get('/nope').redirects(0)
  assert.equal(res.status, 404)
})

test('GET /:code returns 410 for expire link', async () => {
  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  await createTestLink({ code: 'gone', expires_at: past })
  const res = await api().get('/gone').redirects(0)
  assert.equal(res.status, 410)
})

test('each redirect increment click_count by 1', async () => {
  await createTestLink({ code: 'count' })

  for (let i = 0; i < 3; i++) {
    await api().get('/count').redirects(0)
  }

  const res = await api().get('/links/count')
  assert.equal(res.body.click_count, 3)
})

test('click_count survive 50 concurrant redirects without lost update', async () => {
  await createTestLink({ code: 'conc' })
  const CONCURRENCY = 50

  // 50 redirect in parallel
  const results = await Promise.all(Array.from({ length: CONCURRENCY }, () => api().get('/conc').redirects(0)))

  // all request have past
  for (const res of results) {
    assert.equal(res.status, 302)
  }

  // count is the same COMCURREMCY
  const meta = await api().get('/links/conc')
  assert.equal(meta.body.click_count, CONCURRENCY)
})

test('expire link does not record a click', async () => {
  const past = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  await createTestLink({ code: 'noClick', expires_at: past })

  await api().get('/noClick').redirects(0)

  const meta = await api().get('/links/noClick')
  assert.equal(meta.body.click_count, 0)
})
