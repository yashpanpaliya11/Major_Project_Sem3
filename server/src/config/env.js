import dotenv from 'dotenv';

// This module is the single place where environment variables are loaded and
// validated. Import it (directly or transitively) before reading process.env.
dotenv.config({ quiet: true });

const DEFAULT_JWT_SECRET = 'edupulse-super-secret-jwt-key-2026-production-grade';
const EXAMPLE_JWT_SECRET = 'change-me-to-a-long-random-secret';

function toNumber(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback = false) {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : DEFAULT_JWT_SECRET);

// Fail fast instead of booting a production server with a known/shared secret.
if (!jwtSecret) {
  throw new Error('JWT_SECRET is required when NODE_ENV=production');
}
if (
  isProduction &&
  (jwtSecret === DEFAULT_JWT_SECRET || jwtSecret === EXAMPLE_JWT_SECRET || jwtSecret.length < 32)
) {
  throw new Error(
    'JWT_SECRET must be a unique random value of at least 32 characters before deploying to production'
  );
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const clientUrls = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

export const config = {
  nodeEnv,
  isProduction,
  port: toNumber(process.env.PORT, 5001),
  clientUrls,
  publicUrl: (process.env.PUBLIC_URL || '').replace(/\/$/, ''),
  databaseUrl: process.env.DATABASE_URL,

  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  qrSecret: process.env.QR_SECRET || jwtSecret,
  qrRefreshInterval: Math.max(3000, toNumber(process.env.QR_REFRESH_INTERVAL, 7000)),
  qrValidityMs: Math.max(10000, toNumber(process.env.QR_VALIDITY_MS, 15000)),

  serveClient: toBoolean(process.env.SERVE_CLIENT, isProduction),
  trustProxy: toBoolean(process.env.TRUST_PROXY, isProduction),
  adminSignupEnabled: toBoolean(process.env.ADMIN_SIGNUP_ENABLED, false),

  rateLimitWindowMs: toNumber(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: toNumber(process.env.RATE_LIMIT_MAX, 600),
  authRateLimitMax: toNumber(process.env.AUTH_RATE_LIMIT_MAX, 30),
};
