import prisma from '../config/db.js';

const ATTENDED_STATUSES = ['PRESENT', 'LATE'];
export const DEFAULT_THRESHOLD = 75.0;

/**
 * Calculate attendance statistics for a student.
 *
 * Only completed lectures are counted. Every completed lecture has one record
 * per enrolled student (attendance is written as ABSENT when a lecture ends),
 * so the denominator is the number of lectures actually held — not the number
 * of lectures the student happened to check into.
 */
export async function getStudentAttendanceStats(studentId, courseId = null) {
  const sessionFilter = { endTime: { not: null } };
  if (courseId) sessionFilter.courseId = courseId;

  const whereClause = { studentId, session: sessionFilter };

  const [totalSessions, present, late, flaggedProxy, absent] = await Promise.all([
    prisma.attendanceRecord.count({ where: whereClause }),
    prisma.attendanceRecord.count({ where: { ...whereClause, status: 'PRESENT' } }),
    prisma.attendanceRecord.count({ where: { ...whereClause, status: 'LATE' } }),
    prisma.attendanceRecord.count({ where: { ...whereClause, status: 'FLAGGED_PROXY' } }),
    prisma.attendanceRecord.count({ where: { ...whereClause, status: 'ABSENT' } }),
  ]);

  const attended = present + late;
  // A student with no completed lectures yet is not "at risk" by definition.
  const percentage = totalSessions > 0 ? (attended / totalSessions) * 100 : 100;

  return {
    totalSessions,
    present,
    late,
    flaggedProxy,
    absent,
    percentage: Number(percentage.toFixed(1)),
    isAtRisk: totalSessions > 0 && percentage < DEFAULT_THRESHOLD,
  };
}

/**
 * Aggregate institution-wide metrics.
 */
export async function getInstitutionMetrics() {
  const completedSessionFilter = { session: { endTime: { not: null } } };

  const [
    totalStudents,
    totalFaculty,
    totalCourses,
    totalSessions,
    completedSessions,
    totalRecords,
    attendedRecords,
    unresolvedAlerts,
    departments,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'FACULTY' } }),
    prisma.course.count(),
    prisma.lectureSession.count(),
    prisma.lectureSession.count({ where: { endTime: { not: null } } }),
    prisma.attendanceRecord.count({ where: completedSessionFilter }),
    prisma.attendanceRecord.count({
      where: { ...completedSessionFilter, status: { in: ATTENDED_STATUSES } },
    }),
    prisma.proxyAlert.count({ where: { resolved: false } }),
    prisma.course.findMany({ select: { department: true }, distinct: ['department'] }),
  ]);

  const overallPercentage = totalRecords > 0 ? (attendedRecords / totalRecords) * 100 : 0;

  return {
    totalStudents,
    totalFaculty,
    totalCourses,
    totalSessions,
    completedSessions,
    totalRecords,
    overallPercentage: Number(overallPercentage.toFixed(1)),
    activeBatches: departments.length,
    fraudProxyAlertsCount: unresolvedAlerts,
  };
}

export { ATTENDED_STATUSES };
