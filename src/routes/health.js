// check db connection and return 200 if reachable, otherwise return 503
import { Router } from 'express'
import { pool } from '../db.js'

export const healthRouter = Router()

healthRouter.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', database: 'ok' })
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable' })
  }
})
