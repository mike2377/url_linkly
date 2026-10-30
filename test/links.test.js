import { test, before, after, beforeEach } from 'node:test'
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

test('POST /links create a link with generated code', async () => {
  const res = await api().post('/links').send({ target_url: 'https://example.com' })
  assert.equal(res.status, 201)
  assert.match(res.body.code, /^[A-Za-z0-9_-]{3,16}$/)
  assert.equal(res.body.target_url, 'https://example.com')
  assert.equal(res.body.click_count, 0)
  assert.equal(res.body.expires_at, null)
})

test('POST /links respect a custom code', async () => {
  const res = await api().post('/links').send({ target_url: 'https://example.com', code: 'my-link' })

  assert.equal(res.status, 201)
  assert.equal(res.body.code, 'my-link')
})

test('POST /links rejects a duplicate code with 409', async () => {
  await createTestLink({ code: 'taken' })
  const res = await api().post('/links').send({ target_url: 'https://example.com', code: 'taken' })

  assert.equal(res.status, 409)
  assert.equal(res.body.error, 'conflict')
})

test('POST /links reject a invalid URL with 400', async () => {
  const res = await api().post('/links').send({ target_url: 'not-a-url' })

  assert.equal(res.status, 400)
  assert.equal(res.body.error, 'validation_error')
})

test('POST /links reject a non-https URL with 400', async () => {
  const res = await api().post('/links').send({ target_url: 'ftp://example.com' })

  assert.equal(res.status, 400)
})

test('POST /links rejects a code with a dot with 400', async () => {
  const res = await api().post('/links').send({ target_url: 'https://example.com', code: 'has.dot' })

  assert.equal(res.status, 400)
})

test('POST /links rejects a too-short code wit 400', async () => {
  const res = await api().post('/links').send({ target_url: 'https://example.com', code: 'ab' })

  assert.equal(res.status, 400)
})

test('POST /links rejects a too-long code with 400', async () => {
  const res = await api()
    .post('/links')
    .send({ target_url: 'https://example.com', code: 'a'.repeat(17) })

  assert.equal(res.status, 400)
})

test('GET /links/:code return metadata', async () => {
  await createTestLink({ code: 'meta' })
  const res = await api().get('/links/meta')
  assert.equal(res.status, 200)
  assert.equal(res.body.code, 'meta')
  assert.equal(res.body.click_count, 0)
})

test('GET /links/:code return 404 for a unknow code', async () => {
  const res = await api().get('//links/doesnoexist')
  assert.equal(res.status, 404)
  assert.equal(res.body.error, 'not_found')
})
