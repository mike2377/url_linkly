// simple rate limiter per user

export function createRateLimiter({ windowMs, max }) {
  const buckets = new Map()

  return function rateLimter(req, res, next) {
    const key = req.ip || 'unknown'
    const now = Date.now()
    const bucket = buckets.get(key)

    if (!bucket || bucket.resetAt < now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    if (bucket.count >= max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))
      res.setHeader('Retry-After', String(retryAfter))
      return res.status(429).json({
        error: 'rate_limited',
        message: `Too many request, retry in ${retryAfter}`
      })
    }

    bucket.count += 1
    return next()
  }
}
