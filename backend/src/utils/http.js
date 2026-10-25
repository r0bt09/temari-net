class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) console.error('API request failed:', error.message);
  const body = { error: status >= 500 ? 'An internal server error occurred.' : error.message };
  if (error.code) body.code = error.code;
  res.status(status).json(body);
}

module.exports = { HttpError, asyncHandler, errorHandler };
