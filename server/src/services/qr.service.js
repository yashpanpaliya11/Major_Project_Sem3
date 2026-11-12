import crypto from 'crypto';
import prisma from '../config/db.js';
import { config } from '../config/env.js';

const QR_SECRET = config.qrSecret;
const QR_VALIDITY_MS = config.qrValidityMs;
const MAX_CLOCK_SKEW_MS = 5000;

function sign(sessionId, timeBucket) {
  return crypto
    .createHmac('sha256', QR_SECRET)
    .update(`${sessionId}:${timeBucket}`)
    .digest('hex');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/**
 * Build a short-lived QR payload for a lecture session.
 * The payload is base64(JSON({ sessionId, timeBucket, hash })).
 */
export function generateQrPayload(sessionId, timeBucket = Date.now()) {
  const hash = sign(sessionId, timeBucket);
  const payload = Buffer.from(JSON.stringify({ sessionId, timeBucket, hash })).toString('base64');

  return { sessionId, timeBucket, hash, payload };
}

/**
 * Verify a QR payload's signature and freshness.
 */
export function validateQrToken(token) {
  try {
    if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
      return { valid: false, reason: 'Invalid QR token format' };
    }

    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const { sessionId, timeBucket, hash } = JSON.parse(decoded);

    if (typeof sessionId !== 'string' || !Number.isFinite(timeBucket) || typeof hash !== 'string') {
      return { valid: false, reason: 'Malformed QR token: missing fields' };
    }

    if (!safeEqual(hash, sign(sessionId, timeBucket))) {
      return { valid: false, reason: 'Invalid QR token: signature mismatch' };
    }

    const age = Date.now() - timeBucket;
    if (age < -MAX_CLOCK_SKEW_MS) {
      return { valid: false, reason: 'Invalid QR token: timestamp is in the future' };
    }
    if (age > QR_VALIDITY_MS) {
      return { valid: false, reason: 'QR token has expired. Scan the current code on the projector.' };
    }

    return { valid: true, sessionId };
  } catch {
    return { valid: false, reason: 'Invalid QR token format' };
  }
}

/**
 * Persist and return a fresh token for a session.
 */
export async function refreshSessionQr(sessionId) {
  const qrData = generateQrPayload(sessionId);

  await prisma.lectureSession.update({
    where: { id: sessionId },
    data: { activeQrToken: qrData.payload },
  });

  return qrData;
}
