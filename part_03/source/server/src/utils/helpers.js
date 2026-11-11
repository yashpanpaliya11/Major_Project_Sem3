/**
 * Format a Date object into a readable string.
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}

/**
 * Calculate percentage safely, avoiding division by zero.
 * @param {number} part
 * @param {number} total
 * @returns {number} Percentage rounded to 2 decimal places
 */
export function calcPercentage(part, total) {
  if (total === 0) return 0;
  return Math.round((part / total) * 10000) / 100;
}

/**
 * Strip sensitive fields from a user object.
 * @param {object} user
 * @returns {object}
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Create a standardized API response.
 * @param {boolean} success
 * @param {string} message
 * @param {any} data
 * @returns {object}
 */
export function apiResponse(success, message, data = null) {
  const res = { success, message };
  if (data !== null) res.data = data;
  return res;
}

/**
 * Get the start of today (midnight UTC).
 * @returns {Date}
 */
export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Get a date N days ago from now.
 * @param {number} n
 * @returns {Date}
 */
export function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
