import prisma from '../config/db.js';
import { ATTENDED_STATUSES, DEFAULT_THRESHOLD } from './attendance.service.js';
import { sendInterventionEmail } from './email.service.js';

function riskLevelFor(percentage) {
  if (percentage < 50) return 'CRITICAL';
  if (percentage < 65) return 'WARNING';
  return 'CAUTION';
}

/**
 * Find students whose attendance is below the mandatory threshold.
 *
 * Each completed lecture produces one attendance record per enrolled student,
 * so these percentages reflect lectures actually missed rather than only the
 * lectures that were scanned.
 */
export async function getAtRiskStudents(courseId = null, threshold = DEFAULT_THRESHOLD) {
  const studentWhere = { role: 'STUDENT' };
  if (courseId) {
    studentWhere.enrollments = { some: { courseId } };
  }

  const students = await prisma.user.findMany({
    where: studentWhere,
    select: {
      id: true,
      name: true,
      email: true,
      rollNumber: true,
      department: true,
      enrollments: {
        select: {
          courseId: true,
          course: {
            select: {
              code: true,
              name: true,
              faculty: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      records: {
        where: { session: { endTime: { not: null }, ...(courseId && { courseId }) } },
        select: { status: true, session: { select: { courseId: true } } },
      },
    },
  });

  const atRiskList = [];

  for (const student of students) {
    const totalRecords = student.records.length;
    if (totalRecords === 0) continue; // no lectures held yet — nothing to flag

    const attendedRecords = student.records.filter((r) =>
      ATTENDED_STATUSES.includes(r.status)
    ).length;
    const overallPct = (attendedRecords / totalRecords) * 100;

    const courseBreaches = [];
    for (const enrollment of student.enrollments) {
      const cId = enrollment.courseId;
      const courseRecords = student.records.filter((r) => r.session.courseId === cId);
      if (courseRecords.length === 0) continue;

      const present = courseRecords.filter((r) => ATTENDED_STATUSES.includes(r.status)).length;
      const percentage = (present / courseRecords.length) * 100;

      if (percentage < threshold) {
        courseBreaches.push({
          courseId: cId,
          courseCode: enrollment.course.code,
          courseName: enrollment.course.name,
          facultyName: enrollment.course.faculty?.name || 'Faculty',
          total: courseRecords.length,
          present,
          percentage: Number(percentage.toFixed(1)),
        });
      }
    }

    if (overallPct >= threshold && courseBreaches.length === 0) continue;

    // Severity follows the aggregate percentage. A student whose aggregate is
    // healthy but who is below the threshold in one subject is surfaced as a
    // caution until that course recovers.
    const riskLevel = overallPct < threshold ? riskLevelFor(overallPct) : 'CAUTION';

    atRiskList.push({
      studentId: student.id,
      name: student.name,
      email: student.email,
      rollNumber: student.rollNumber || 'N/A',
      department: student.department || 'General',
      overallPercentage: Number(overallPct.toFixed(1)),
      riskLevel,
      courseBreaches: courseBreaches.sort((a, b) => a.percentage - b.percentage),
    });
  }

  return atRiskList.sort((a, b) => a.overallPercentage - b.overallPercentage);
}

/**
 * Generate a formal draft notice for a student's parent/guardian and advisor.
 */
export function generateInterventionNotice(student, courseDetails = null) {
  const date = new Date().toLocaleDateString('en-US', { dateStyle: 'long' });
  const percentage = Number(student.overallPercentage || 0);
  const identifier = student.rollNumber || student.studentId || 'N/A';

  const subject = `Official Academic Attendance Warning - ${student.name} (${identifier})`;

  const content = `
DATE: ${date}
RECIPIENT: Parent/Guardian & Academic Advisor of ${student.name}
ROLL NUMBER: ${identifier}
DEPARTMENT: ${student.department || 'Engineering'}

SUBJECT: Official Notice of Attendance Shortfall (<${DEFAULT_THRESHOLD.toFixed(1)}% Mandatory Threshold)

Dear Guardian & Faculty Advisor,

This is an automated formal notification issued by the EduPulse Academic Compliance System.
The student ${student.name} currently holds an aggregate attendance of ${percentage.toFixed(1)}%, which is below the institution's mandatory ${DEFAULT_THRESHOLD.toFixed(1)}% threshold.

${
  courseDetails
    ? `Course affected: ${courseDetails.name} (${courseDetails.code}) - Recorded: ${courseDetails.percentage}%`
    : 'A course-wise shortfall has been detected across enrolled subjects. Please review the attendance ledger.'
}

ACTION REQUIRED:
1. Schedule an advisory counseling session within 3 working days.
2. Submit medical or formal leave documentation for retroactive consideration.
3. Continued unexcused absence may result in debarment from end-semester examinations.

Issued by:
Office of Academic Affairs & Attendance Automation Directorate
EduPulse Platform Security & Audit Engine
`.trim();

  return {
    subject,
    content,
    generatedAt: new Date().toISOString(),
    recipient: student.email,
    severity: percentage < 50 ? 'HIGH' : 'MEDIUM',
  };
}

/**
 * Dispatch real academic warning email and persist in-app notification ledger.
 */
export async function dispatchInterventionNotice({
  studentId,
  courseId,
  facultyName,
  notes,
  io,
}) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, rollNumber: true, department: true },
  });

  if (!student) {
    throw new Error('Student not found');
  }

  let courseDetails = null;
  let stats = { total: 0, attended: 0, percentage: 0 };

  if (courseId) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sessions: {
          where: { endTime: { not: null } },
          include: {
            records: { where: { studentId } },
          },
        },
      },
    });

    if (course) {
      const total = course.sessions.length;
      const attended = course.sessions.filter((s) =>
        s.records.some((r) => ATTENDED_STATUSES.includes(r.status))
      ).length;
      const pct = total > 0 ? Number(((attended / total) * 100).toFixed(1)) : 0;
      courseDetails = {
        name: course.name,
        code: course.code,
        percentage: pct,
        total,
        attended,
      };
      stats = { total, attended, percentage: pct };
    }
  }

  // 1. Dispatch real email via Nodemailer
  const emailResult = await sendInterventionEmail({
    toEmail: student.email,
    studentName: student.name,
    rollNumber: student.rollNumber,
    courseName: courseDetails?.name || 'Enrolled Curriculum',
    courseCode: courseDetails?.code || 'INST-CORE',
    attendancePercentage: courseDetails?.percentage || 0,
    missedCount: stats.total - stats.attended,
    totalLectures: stats.total,
    facultyName,
    notes,
  });

  // 2. Persist in database Notification ledger
  const notification = await prisma.notification.create({
    data: {
      userId: student.id,
      title: `Critical Attendance Warning: ${courseDetails?.code || 'Shortfall'} (${courseDetails?.percentage || 0}%)`,
      message: `Your aggregate attendance has fallen below 75%. Instructor: ${facultyName || 'Academic Office'}. Check your institutional email for details.`,
      type: stats.percentage < 50 ? 'CRITICAL' : 'WARNING',
      emailUrl: emailResult.previewUrl || null,
    },
  });

  // 3. Emit real-time WebSocket notification if client connected
  if (io) {
    io.to(`user:${student.id}`).emit('notification:new', { notification });
  }

  return {
    success: true,
    notification,
    emailResult,
  };
}
