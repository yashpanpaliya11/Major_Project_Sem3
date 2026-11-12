import { config } from '../config/env.js';

const PRISMA_CONFLICT = 'P2002';
const PRISMA_NOT_FOUND = 'P2025';
const PRISMA_FK = 'P2003';

/**
 * Global error handler. Never leaks stack traces in production.
 */
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || err.status || 500;

  if (statusCode >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}:`, err);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON body' });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body is too large' });
  }

  if (err.code === PRISMA_CONFLICT) {
    const fields = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
    return res.status(409).json({ success: false, message: `Duplicate value for ${fields}` });
  }

  if (err.code === PRISMA_NOT_FOUND) {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  if (err.code === PRISMA_FK) {
    return res.status(409).json({
      success: false,
      message: 'This record is still referenced by other data and cannot be removed',
    });
  }

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 500 && config.isProduction
        ? 'Internal Server Error'
        : err.message || 'Internal Server Error',
    ...(!config.isProduction && { stack: err.stack }),
  });
};

export default errorHandler;
