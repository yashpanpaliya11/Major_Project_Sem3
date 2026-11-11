export const ROLES = ['ADMIN', 'FACULTY', 'STUDENT'];
export const SESSION_TYPES = ['IN_PERSON', 'ONLINE', 'HYBRID'];
export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE'];
export const PROXY_ACTIONS = ['APPROVE', 'BLOCK', 'FLAG'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value) {
  return typeof value === 'string' && value.length <= 254 && EMAIL_RE.test(value);
}

export function isNonEmptyString(value, max = 500) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max;
}

export function isValidUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

export function parseOptionalFloat(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
