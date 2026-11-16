// HTTP class for error
export class HttpError extends Error {
  constructor (status, code, message) {
    super(message)
    this.name = this.constructor.name
    this.status = status
    this.code = code
  }
}

// 400 Bad Request
export class BadRequestError extends HttpError {
  constructor (message = 'Bad request') {
    super(400, 'bad_request', message)
  }
}

// 404 Not Found
export class NotFoundError extends HttpError {
  constructor (message = 'Not found') {
    super(404, 'not_found', message)
  }
}

// 409 Conflict (e.g., code already exists)
export class ConflictError extends HttpError {
  constructor (message = 'Conflict') {
    super(409, 'conflict', message)
  }
}

// 410 Gone (e.g., link expired)
export class GoneError extends HttpError {
  constructor (message = 'Gone') {
    super(410, 'gone', message)
  }
}
