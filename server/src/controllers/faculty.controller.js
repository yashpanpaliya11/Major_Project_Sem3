import prisma from '../config/db.js';
import { generateQrPayload } from '../services/qr.service.js';
import { getAtRiskStudents, dispatchInterventionNotice } from '../services/intervention.service.js';
import { startSessionQrRotation, stopSessionQrRotation } from '../socket/index.js';
import {
  ATTENDANCE_STATUSES,
  SESSION_TYPES,
  isValidUuid,
  parseOptionalFloat,
} from '../utils/validation.js';

// In-memory registry of active engagement challenges for online/hybrid sessions
export const activeEngagementPings = new Map();

async function findSessionForUser(sessionId, user) {
  const session = await prisma.lectureSession.findUnique({
    where: { id: sessionId },
    include: { course: true },
  });

  if (!session) return { error: { status: 404, message: 'Session not found' } };

  if (user.role !== 'ADMIN' && session.course.facultyId !== user.id) {
    return { error: { status: 403, message: 'You do not have access to this lecture session' } };
  }

  return { session };
}

/**
 * Faculty dashboard: assigned courses, live sessions and turnout.
 */
export async function getDashboard(req, res, next) {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const courseWhere = isAdmin ? {} : { facultyId: req.user.id };

    const courses = await prisma.course.findMany({
      where: courseWhere,
      include: { _count: { select: { enrollments: true, sessions: true } } },
    });

    const courseIds = courses.map((c) => c.id);

    const [activeSessions, recentSessions, totalRecords, attendedRecords] = await Promise.all([
      prisma.lectureSession.findMany({
        where: { courseId: { in: courseIds }, endTime: null },
        include: { course: true, _count: { select: { records: true } } },
        orderBy: { startTime: 'desc' },
      }),
      prisma.lectureSession.findMany({
        where: { courseId: { in: courseIds } },
        take: 5,
        orderBy: { startTime: 'desc' },
        include: { course: true, _count: { select: { records: true } } },
      }),
      prisma.attendanceRecord.count({
        where: { session: { courseId: { in: courseIds }, endTime: { not: null } } },
      }),
      prisma.attendanceRecord.count({
        where: {
          session: { courseId: { in: courseIds }, endTime: { not: null } },
          status: { in: ['PRESENT', 'LATE'] },
        },
      }),
    ]);

    const avgAttendance = totalRecords > 0 ? (attendedRecords / totalRecords) * 100 : 0;

    const atRiskStudents = await getAtRiskStudents();
    const facultyAtRisk = atRiskStudents.filter((s) =>
      s.courseBreaches.some((cb) => courseIds.includes(cb.courseId))
    );

    return res.json({
      success: true,
      stats: {
        totalCourses: courses.length,
        activeSessionsCount: activeSessions.length,
        averageAttendance: Number(avgAttendance.toFixed(1)),
        flaggedStudentsCount: facultyAtRisk.length,
      },
      courses,
      activeSessions,
      recentSessions,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Launch a lecture session and start its rolling QR immediately.
 */
export async function createSession(req, res, next) {
  try {
    const { courseId, sessionType = 'IN_PERSON' } = req.body;

    if (!isValidUuid(courseId)) {
      return res.status(400).json({ success: false, message: 'A valid course ID is required' });
    }
    if (!SESSION_TYPES.includes(sessionType)) {
      return res.status(400).json({ success: false, message: 'Invalid session type' });
    }

    const latitude = parseOptionalFloat(req.body.latitude);
    const longitude = parseOptionalFloat(req.body.longitude);
    const radiusMeters = parseOptionalFloat(req.body.radiusMeters) ?? 50;

    if ((latitude === null) !== (longitude === null)) {
      return res.status(400).json({ success: false, message: 'Both latitude and longitude are required' });
    }
    if (latitude !== null && (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
      return res.status(400).json({ success: false, message: 'Coordinates are out of range' });
    }
    if (radiusMeters < 10 || radiusMeters > 1000) {
      return res.status(400).json({ success: false, message: 'Geofence radius must be between 10m and 1000m' });
    }

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        ...(req.user.role === 'ADMIN' ? {} : { facultyId: req.user.id }),
      },
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found or not assigned to you' });
    }

    const existingActive = await prisma.lectureSession.findFirst({
      where: { courseId, endTime: null },
      select: { id: true },
    });

    if (existingActive) {
      return res.status(409).json({
        success: false,
        message: 'This course already has an active lecture session. End it before starting a new one.',
        sessionId: existingActive.id,
      });
    }

    // Only in-person lectures are geofenced. ONLINE and HYBRID sessions exist
    // to allow remote check-in; device/network checks still apply.
    const geofenced = sessionType === 'IN_PERSON';

    const session = await prisma.lectureSession.create({
      data: {
        courseId,
        sessionType,
        latitude: geofenced ? latitude : null,
        longitude: geofenced ? longitude : null,
        radiusMeters,
      },
      include: { course: true },
    });

    const qrData = generateQrPayload(session.id);
    const updatedSession = await prisma.lectureSession.update({
      where: { id: session.id },
      data: { activeQrToken: qrData.payload },
      include: { course: true },
    });

    const io = req.app.get('io');
    if (io) {
      startSessionQrRotation(io, session.id);
      io.emit('session:started', { sessionId: session.id, courseId });
    }

    return res.status(201).json({
      success: true,
      message: 'Lecture session launched successfully',
      session: updatedSession,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * End a session, stop its QR rotation and write ABSENT records for everyone
 * who never checked in.
 */
export async function endSession(req, res, next) {
  try {
    const { id } = req.params;
    const { session, error } = await findSessionForUser(id, req.user);
    if (error) {
      return res.status(error.status).json({ success: false, message: error.message });
    }

    if (session.endTime) {
      stopSessionQrRotation(id);
      return res.json({ success: true, message: 'Session was already concluded', session });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedSession = await tx.lectureSession.update({
        where: { id },
        data: { endTime: new Date(), activeQrToken: null },
      });

      const enrollments = await tx.enrollment.findMany({
        where: { courseId: session.courseId },
        select: { studentId: true },
      });

      let absentCreated = 0;
      if (enrollments.length > 0) {
        const created = await tx.attendanceRecord.createMany({
          data: enrollments.map((e) => ({
            sessionId: id,
            studentId: e.studentId,
            status: 'ABSENT',
            method: 'AUTO_ROLL_CALL',
          })),
          skipDuplicates: true,
        });
        absentCreated = created.count;
      }

      return { updatedSession, absentCreated };
    });

    stopSessionQrRotation(id);

    const io = req.app.get('io');
    if (io) {
      io.to(`session:${id}`).emit('session:ended', { sessionId: id });
    }

    return res.json({
      success: true,
      message: 'Lecture session concluded',
      session: result.updatedSession,
      absentCreated: result.absentCreated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Live attendance feed for a session.
 */
export async function getLiveAttendance(req, res, next) {
  try {
    const { id } = req.params;
    const access = await findSessionForUser(id, req.user);
    if (access.error) {
      return res.status(access.error.status).json({ success: false, message: access.error.message });
    }

    const session = await prisma.lectureSession.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            enrollments: {
              include: {
                student: {
                  select: { id: true, name: true, rollNumber: true, email: true, department: true },
                },
              },
            },
          },
        },
        records: {
          include: {
            student: {
              select: { id: true, name: true, rollNumber: true, email: true, department: true },
            },
          },
          orderBy: { timestamp: 'desc' },
        },
        proxyAlerts: {
          include: { student: { select: { id: true, name: true, rollNumber: true } } },
          orderBy: { flaggedAt: 'desc' },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    const totalEnrolled = session.course.enrollments.length;
    const presentCount = session.records.filter((r) => r.status === 'PRESENT').length;
    const lateCount = session.records.filter((r) => r.status === 'LATE').length;
    const absentCount = session.records.filter((r) => r.status === 'ABSENT').length;
    const proxyCount = session.records.filter((r) => r.status === 'FLAGGED_PROXY').length;

    return res.json({
      success: true,
      session,
      stats: {
        totalEnrolled,
        presentCount,
        lateCount,
        absentCount,
        proxyCount,
        attendanceRate:
          totalEnrolled > 0 ? Math.round(((presentCount + lateCount) / totalEnrolled) * 100) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Manual override by faculty/admin.
 */
export async function manualOverride(req, res, next) {
  try {
    const { sessionId, studentId, status } = req.body;

    if (!isValidUuid(sessionId) || !isValidUuid(studentId) || !status) {
      return res.status(400).json({
        success: false,
        message: 'sessionId, studentId, and status are required',
      });
    }
    if (!ATTENDANCE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${ATTENDANCE_STATUSES.join(', ')}`,
      });
    }

    const access = await findSessionForUser(sessionId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({ success: false, message: access.error.message });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId: access.session.courseId } },
      select: { id: true },
    });

    if (!enrollment) {
      return res.status(400).json({ success: false, message: 'Student is not enrolled in this course' });
    }

    const record = await prisma.$transaction(async (tx) => {
      const updated = await tx.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId, studentId } },
        update: { status, method: 'MANUAL' },
        create: { sessionId, studentId, status, method: 'MANUAL' },
        include: { student: { select: { id: true, name: true, rollNumber: true } } },
      });

      // A faculty member attesting attendance resolves any open incident.
      if (status === 'PRESENT' || status === 'LATE') {
        await tx.proxyAlert.updateMany({
          where: { sessionId, studentId, resolved: false },
          data: { resolved: true },
        });
      }

      return updated;
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`session:${sessionId}`).emit('attendance:new', { record });
    }

    return res.json({
      success: true,
      message: `Student status successfully updated to ${status}`,
      record,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Students below the threshold, scoped to the faculty member's courses.
 */
export async function getStudentRisk(req, res, next) {
  try {
    const { courseId } = req.query;

    if (courseId && !isValidUuid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    let atRisk = await getAtRiskStudents(courseId || null);

    if (req.user.role !== 'ADMIN') {
      const courses = await prisma.course.findMany({
        where: { facultyId: req.user.id },
        select: { id: true },
      });
      const courseIds = new Set(courses.map((c) => c.id));
      atRisk = atRisk.filter((s) => s.courseBreaches.some((cb) => courseIds.has(cb.courseId)));
    }

    return res.json({ success: true, atRisk });
  } catch (error) {
    next(error);
  }
}

/**
 * Dispatch real academic intervention notice (Email + In-App notification ledger).
 */
export async function sendIntervention(req, res, next) {
  try {
    const { studentId, courseId, notes } = req.body;

    if (!isValidUuid(studentId)) {
      return res.status(400).json({ success: false, message: 'Valid student ID is required' });
    }

    const io = req.app.get('io');
    const result = await dispatchInterventionNotice({
      studentId,
      courseId,
      facultyName: req.user.name,
      notes,
      io,
    });

    return res.json({
      success: true,
      message: 'Official warning notice and email dispatched successfully',
      notification: result.notification,
      emailResult: result.emailResult,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Trigger a 60-second Active Engagement Ping for an online or hybrid lecture session.
 */
export async function triggerEngagementPing(req, res, next) {
  try {
    const { id: sessionId } = req.params;

    if (!isValidUuid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Valid session ID is required' });
    }

    const access = await findSessionForUser(sessionId, req.user);
    if (access.error) {
      return res.status(access.error.status).json({ success: false, message: access.error.message });
    }

    if (access.session.endTime) {
      return res.status(400).json({ success: false, message: 'Cannot trigger ping on completed session' });
    }

    // Generate random 4-digit numeric engagement code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const durationSeconds = 60;
    const expiresAt = new Date(Date.now() + durationSeconds * 1000);

    const pingData = {
      sessionId,
      code,
      startedAt: new Date(),
      expiresAt,
      durationSeconds,
      responses: new Set(),
    };

    activeEngagementPings.set(sessionId, pingData);

    const io = req.app.get('io');
    if (io) {
      io.to(`session:${sessionId}`).emit('engagement:ping', {
        sessionId,
        code,
        durationSeconds,
        expiresAt: expiresAt.toISOString(),
      });
    }

    return res.json({
      success: true,
      message: 'Active engagement ping broadcasted to lecture attendees',
      code,
      durationSeconds,
      expiresAt,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get current engagement status for a session.
 */
export async function getEngagementStatus(req, res, next) {
  try {
    const { id: sessionId } = req.params;

    if (!isValidUuid(sessionId)) {
      return res.status(400).json({ success: false, message: 'Valid session ID is required' });
    }

    const ping = activeEngagementPings.get(sessionId);
    if (!ping) {
      return res.json({ success: true, active: false });
    }

    const now = Date.now();
    const isExpired = now >= ping.expiresAt.getTime();
    const secondsRemaining = isExpired ? 0 : Math.ceil((ping.expiresAt.getTime() - now) / 1000);

    return res.json({
      success: true,
      active: !isExpired,
      code: ping.code,
      secondsRemaining,
      respondedCount: ping.responses.size,
      respondedStudentIds: Array.from(ping.responses),
    });
  } catch (error) {
    next(error);
  }
}
