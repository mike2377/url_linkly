// express error handler
import { ZodError } from 'zod'
import { HttpError } from '../utils/errors.js'

// express requires to recognize this as an error handler
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'validation_error',
      issues: err.issues.map((issue) => ({
        path: issue.path,
        message: issue.message
      }))
    })
  }

  // Custom HTTP errors carry their own status and code
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message
    })
  }

  // Anything else is a server bug
  console.error('Unhandled error:', err)
  return res.status(500).json({
    error: 'internal_error',
    message: 'Something went wrong'
  })
}
