import prisma from '../config/db.js';
import { haversineDistance } from '../utils/geofence.js';

/**
 * Validate a latitude/longitude pair.
 */
export function isValidCoordinate(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Check whether the student is inside the classroom geofence.
 * A session without coordinates is not geofenced.
 */
export function checkGeofence(studentLat, studentLng, sessionLat, sessionLng, radius) {
  if (sessionLat == null || sessionLng == null) {
    return { passed: true, distance: 0 };
  }

  if (studentLat == null || studentLng == null) {
    return { passed: false, distance: null, reason: 'Student location not provided — geofence check failed' };
  }

  if (!isValidCoordinate(studentLat, studentLng)) {
    return { passed: false, distance: null, reason: 'Invalid student coordinates' };
  }

  const distance = haversineDistance(studentLat, studentLng, sessionLat, sessionLng);

  if (distance > radius) {
    return {
      passed: false,
      distance: Math.round(distance),
      reason: `Student is ${Math.round(distance)}m away from class (max: ${radius}m)`,
    };
  }

  return { passed: true, distance: Math.round(distance) };
}

/**
 * Detect a rapid burst from the same network *and* the same device used by a
 * different student in the same lecture.
 *
 * Matching on IP alone produces constant false positives on campus NAT, where
 * every student shares one public address, so the device fingerprint must also
 * match.
 */
export async function checkRapidDuplicate(ip, deviceInfo, sessionId, studentId, windowMs = 5000) {
  if (!ip || !deviceInfo) return { passed: true };

  const duplicateRecords = await prisma.attendanceRecord.findMany({
    where: {
      sessionId,
      ipAddress: ip,
      deviceInfo,
      studentId: { not: studentId },
      timestamp: { gte: new Date(Date.now() - windowMs) },
    },
    select: { id: true },
  });

  if (duplicateRecords.length > 0) {
    return {
      passed: false,
      reason: 'Same device and network used by another student moments earlier in this lecture',
    };
  }

  return { passed: true };
}

/**
 * Detect the same device fingerprint being used by different students.
 */
export async function checkDeviceFingerprint(deviceInfo, sessionId, studentId) {
  if (!deviceInfo) return { passed: true };

  const existingRecords = await prisma.attendanceRecord.findMany({
    where: { sessionId, deviceInfo, studentId: { not: studentId } },
    select: { id: true },
  });

  if (existingRecords.length > 0) {
    return {
      passed: false,
      reason: 'This device was already used to check in another student for this lecture',
    };
  }

  return { passed: true };
}

/**
 * Run every anti-proxy check and aggregate the failures.
 */
export async function runAllChecks(data) {
  const reasons = [];

  const geoResult = checkGeofence(
    data.studentLat,
    data.studentLng,
    data.sessionLat,
    data.sessionLng,
    data.radius
  );
  if (!geoResult.passed && geoResult.reason) reasons.push(geoResult.reason);

  const rapidResult = await checkRapidDuplicate(
    data.ip,
    data.deviceInfo,
    data.sessionId,
    data.studentId
  );
  if (!rapidResult.passed && rapidResult.reason) reasons.push(rapidResult.reason);

  const deviceResult = await checkDeviceFingerprint(
    data.deviceInfo,
    data.sessionId,
    data.studentId
  );
  if (!deviceResult.passed && deviceResult.reason) reasons.push(deviceResult.reason);

  return { passed: reasons.length === 0, reasons };
}
