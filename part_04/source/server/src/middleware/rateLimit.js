import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

const message = {
  success: false,
  message: 'Too many requests. Please wait a moment and try again.',
};

export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message,
});

export const authLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.authRateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  // Keep local development and automated tests unthrottled; production is
  // always protected.
  skip: () => !config.isProduction,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait before trying again.',
  },
});
