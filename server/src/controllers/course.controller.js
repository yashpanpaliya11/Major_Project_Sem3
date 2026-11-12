import prisma from '../config/db.js';
import { stopSessionQrRotation } from '../socket/index.js';
import { isNonEmptyString, isValidUuid } from '../utils/validation.js';

const COURSE_CODE_RE = /^[A-Z0-9][A-Z0-9-]{1,19}$/;

async function resolveFaculty(facultyId) {
  if (!isValidUuid(facultyId)) return null;
  return prisma.user.findFirst({
    where: { id: facultyId, role: 'FACULTY' },
    select: { id: true },
  });
}

/**
 * List courses with faculty and counts.
 */
export async function getCourses(req, res, next) {
  try {
    const { department, facultyId } = req.query;
    const where = {};

    if (isNonEmptyString(department, 100)) where.department = department.trim();
    if (facultyId) {
      if (!isValidUuid(facultyId)) {
        return res.status(400).json({ success: false, message: 'Invalid faculty ID' });
      }
      where.facultyId = facultyId;
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        faculty: { select: { id: true, name: true, email: true, department: true } },
        _count: { select: { enrollments: true, sessions: true } },
      },
      orderBy: { code: 'asc' },
    });

    return res.json({ success: true, courses });
  } catch (error) {
    next(error);
  }
}

/**
 * Single course with enrolled students and recent sessions.
 */
export async function getCourseById(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        faculty: { select: { id: true, name: true, email: true, department: true } },
        enrollments: {
          include: {
            student: {
              select: { id: true, name: true, rollNumber: true, email: true, department: true },
            },
          },
        },
        sessions: {
          orderBy: { startTime: 'desc' },
          take: 10,
          include: { _count: { select: { records: true } } },
        },
      },
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Students may only inspect courses they are enrolled in; the response
    // includes the class roster.
    if (
      req.user.role === 'STUDENT' &&
      !course.enrollments.some((enrollment) => enrollment.student.id === req.user.id)
    ) {
      return res.status(403).json({ success: false, message: 'You are not enrolled in this course' });
    }

    return res.json({ success: true, course });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a course (admin only).
 */
export async function createCourse(req, res, next) {
  try {
    const code = typeof req.body.code === 'string' ? req.body.code.trim().toUpperCase() : '';
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const department = typeof req.body.department === 'string' ? req.body.department.trim() : '';
    const { facultyId } = req.body;

    if (!COURSE_CODE_RE.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'Course code must be 2-20 characters (letters, numbers, hyphens)',
      });
    }
    if (!isNonEmptyString(name, 160) || !isNonEmptyString(department, 100)) {
      return res.status(400).json({ success: false, message: 'Course name and department are required' });
    }

    const faculty = await resolveFaculty(facultyId);
    if (!faculty) {
      return res.status(400).json({ success: false, message: 'A valid faculty member is required' });
    }

    const course = await prisma.course.create({
      data: { code, name, department, facultyId },
      include: { faculty: { select: { id: true, name: true, email: true } } },
    });

    return res.status(201).json({ success: true, course });
  } catch (error) {
    next(error);
  }
}

/**
 * Update a course (admin only).
 */
export async function updateCourse(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    const data = {};

    if (req.body.code !== undefined) {
      const code = String(req.body.code).trim().toUpperCase();
      if (!COURSE_CODE_RE.test(code)) {
        return res.status(400).json({ success: false, message: 'Invalid course code' });
      }
      data.code = code;
    }
    if (req.body.name !== undefined) {
      if (!isNonEmptyString(req.body.name, 160)) {
        return res.status(400).json({ success: false, message: 'Invalid course name' });
      }
      data.name = req.body.name.trim();
    }
    if (req.body.department !== undefined) {
      if (!isNonEmptyString(req.body.department, 100)) {
        return res.status(400).json({ success: false, message: 'Invalid department' });
      }
      data.department = req.body.department.trim();
    }
    if (req.body.facultyId !== undefined) {
      const faculty = await resolveFaculty(req.body.facultyId);
      if (!faculty) {
        return res.status(400).json({ success: false, message: 'A valid faculty member is required' });
      }
      data.facultyId = req.body.facultyId;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    const course = await prisma.course.update({
      where: { id },
      data,
      include: { faculty: { select: { id: true, name: true, email: true } } },
    });

    return res.json({ success: true, course });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a course and everything that depends on it.
 */
export async function deleteCourse(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }

    const course = await prisma.course.findUnique({
      where: { id },
      include: { sessions: { select: { id: true } } },
    });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    for (const session of course.sessions) {
      stopSessionQrRotation(session.id);
    }

    // Sessions, records, alerts and enrollments cascade from the schema.
    await prisma.course.delete({ where: { id } });

    return res.json({ success: true, message: 'Course and related data deleted' });
  } catch (error) {
    next(error);
  }
}

/**
 * Enroll a student. Faculty can only enroll into their own courses.
 */
export async function enrollStudent(req, res, next) {
  try {
    const { courseId, studentId } = req.body;

    if (!isValidUuid(courseId) || !isValidUuid(studentId)) {
      return res.status(400).json({ success: false, message: 'courseId and studentId are required' });
    }

    const [course, student] = await Promise.all([
      prisma.course.findUnique({ where: { id: courseId }, select: { id: true, facultyId: true } }),
      prisma.user.findFirst({ where: { id: studentId, role: 'STUDENT' }, select: { id: true } }),
    ]);

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    if (req.user.role === 'FACULTY' && course.facultyId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'You can only enroll students in your own courses' });
    }

    const existing = await prisma.enrollment.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
      select: { id: true },
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Student is already enrolled in this course' });
    }

    const enrollment = await prisma.enrollment.create({
      data: { courseId, studentId },
      include: {
        student: { select: { id: true, name: true, rollNumber: true, email: true } },
      },
    });

    return res.status(201).json({ success: true, message: 'Student successfully enrolled', enrollment });
  } catch (error) {
    next(error);
  }
}

/**
 * Students available for enrollment.
 */
export async function getAllStudents(req, res, next) {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, email: true, rollNumber: true, department: true },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, students });
  } catch (error) {
    next(error);
  }
}

/**
 * Faculty list (admin only).
 */
export async function getAllFaculty(req, res, next) {
  try {
    const faculty = await prisma.user.findMany({
      where: { role: 'FACULTY' },
      select: { id: true, name: true, email: true, department: true },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, faculty });
  } catch (error) {
    next(error);
  }
}
