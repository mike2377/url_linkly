import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import express from 'express'
import { createRateLimiter } from '#src/middleware/rateLimit.js'

function buildTestApp(max) {
  const app = express()
  app.use(express.json())
  app.post('/x', createRateLimiter({ windowMs: 60_000, max }), (req, res) => {
    res.json({ ok: true })
  })
  return request(app)
}

test('rate limiter allows up to max then returns 429', async () => {
  const api = buildTestApp(3)

  assert.equal((await api.post('/x')).status, 200)
  assert.equal((await api.post('/x')).status, 200)
  assert.equal((await api.post('/x')).status, 200)

  const overLimit = await api.post('/x')
  assert.equal(overLimit.status, 429)
  assert.equal(overLimit.body.error, 'rate_limited')
})

test('rate limiter sets Retry-After on 429', async () => {
  const api = buildTestApp(1)

  await api.post('/x')
  const overLimit = await api.post('/x')

  assert.equal(overLimit.status, 429)
  assert.ok(overLimit.headers['retry-after'])
  assert.ok(Number(overLimit.headers['retry-after']) > 0)
})
