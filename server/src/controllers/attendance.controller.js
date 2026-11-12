import prisma from '../config/db.js';
import { getAtRiskStudents, generateInterventionNotice } from '../services/intervention.service.js';
import { getStudentAttendanceStats } from '../services/attendance.service.js';
import { ATTENDANCE_STATUSES, isValidUuid } from '../utils/validation.js';

async function getFacultyCourseIds(userId) {
  const courses = await prisma.course.findMany({
    where: { facultyId: userId },
    select: { id: true },
  });
  return new Set(courses.map((course) => course.id));
}

/**
 * Filtered attendance report.
 */
export async function getReport(req, res, next) {
  try {
    const { courseId, studentId, status, startDate, endDate } = req.query;
    const where = {};

    if (courseId) {
      if (!isValidUuid(courseId)) {
        return res.status(400).json({ success: false, message: 'Invalid course ID' });
      }
      where.session = { courseId };
    }

    if (req.user.role === 'FACULTY') {
      const ownedCourseIds = await getFacultyCourseIds(req.user.id);
      if (courseId && !ownedCourseIds.has(courseId)) {
        return res.status(403).json({ success: false, message: 'You can only view reports for your own courses' });
      }
      if (!courseId) {
        where.session = { ...(where.session || {}), course: { facultyId: req.user.id } };
      }
    }

    if (studentId) {
      if (!isValidUuid(studentId)) {
        return res.status(400).json({ success: false, message: 'Invalid student ID' });
      }
      where.studentId = studentId;
    }
    if (status) {
      if (!ATTENDANCE_STATUSES.includes(status) && status !== 'FLAGGED_PROXY') {
        return res.status(400).json({ success: false, message: 'Invalid attendance status' });
      }
      where.status = status;
    }
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        const start = new Date(startDate);
        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid start date' });
        }
        where.timestamp.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid end date' });
        }
        where.timestamp.lte = end;
      }
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 500,
      include: {
        student: {
          select: { id: true, name: true, rollNumber: true, email: true, department: true },
        },
        session: {
          include: { course: { select: { code: true, name: true } } },
        },
      },
    });

    return res.json({ success: true, count: records.length, records });
  } catch (error) {
    next(error);
  }
}

/**
 * Students below the threshold.
 */
export async function getInterventionList(req, res, next) {
  try {
    const { courseId, threshold } = req.query;

    if (courseId && !isValidUuid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    const parsedThreshold = threshold === undefined ? 75 : Number(threshold);
    if (!Number.isFinite(parsedThreshold) || parsedThreshold < 0 || parsedThreshold > 100) {
      return res.status(400).json({ success: false, message: 'Threshold must be between 0 and 100' });
    }

    let atRisk = await getAtRiskStudents(courseId || null, parsedThreshold);

    if (req.user.role === 'FACULTY') {
      const ownedCourseIds = await getFacultyCourseIds(req.user.id);
      if (courseId && !ownedCourseIds.has(courseId)) {
        return res.status(403).json({ success: false, message: 'You can only view your own courses' });
      }
      atRisk = atRisk.filter((student) =>
        student.courseBreaches.some((breach) => ownedCourseIds.has(breach.courseId))
      );
    }

    return res.json({ success: true, threshold: parsedThreshold, atRisk });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate an official draft notice for a parent/advisor.
 */
export async function generateAlert(req, res, next) {
  try {
    const { studentId, courseId } = req.body;

    if (!isValidUuid(studentId)) {
      return res.status(400).json({ success: false, message: 'A valid studentId is required' });
    }
    if (courseId && !isValidUuid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    const student = await prisma.user.findFirst({
      where: { id: studentId, role: 'STUDENT' },
      select: {
        id: true,
        name: true,
        email: true,
        rollNumber: true,
        department: true,
      },
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (courseId) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: student.id, courseId } },
        select: { id: true },
      });
      if (!enrollment) {
        return res.status(400).json({ success: false, message: 'Student is not enrolled in this course' });
      }
    }

    if (req.user.role === 'FACULTY') {
      if (courseId) {
        const ownsCourse = await prisma.course.findFirst({
          where: { id: courseId, facultyId: req.user.id },
          select: { id: true },
        });
        if (!ownsCourse) {
          return res.status(403).json({ success: false, message: 'You can only issue notices for your own courses' });
        }
      } else {
        const taughtStudent = await prisma.enrollment.findFirst({
          where: { studentId: student.id, course: { facultyId: req.user.id } },
          select: { id: true },
        });
        if (!taughtStudent) {
          return res.status(403).json({ success: false, message: 'You can only issue notices to students you teach' });
        }
      }
    }

    const [overallStats, courseStats, course] = await Promise.all([
      getStudentAttendanceStats(student.id),
      courseId ? getStudentAttendanceStats(student.id, courseId) : Promise.resolve(null),
      courseId ? prisma.course.findUnique({ where: { id: courseId } }) : Promise.resolve(null),
    ]);

    const courseDetails =
      course && courseStats
        ? { name: course.name, code: course.code, percentage: courseStats.percentage }
        : null;

    const notice = generateInterventionNotice(
      {
        studentId: student.id,
        name: student.name,
        email: student.email,
        rollNumber: student.rollNumber,
        department: student.department,
        overallPercentage: overallStats.percentage,
      },
      courseDetails
    );

    return res.json({
      success: true,
      message: 'Official warning notice generated successfully',
      notice,
    });
  } catch (error) {
    next(error);
  }
}
