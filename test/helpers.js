import request from 'supertest'
import { createApp } from '../src/app.js'

// single app instance per file
const app = createApp()

export function api () {
  return request(app)
}

// Uses the real API to full test
export async function createTestLink (overrides = {}) {
  const res = await api()
    .post('/links')
    .send({ target_url: 'https://example.com', ...overrides })

  if (res.status !== 201) {
    throw new Error(`createTestLink failed: ${res.status} ${JSON.stringify(res.body)}`)
  }
  return res.body
}
