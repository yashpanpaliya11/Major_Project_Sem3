import prisma from '../config/db.js';
import {
  getInstitutionMetrics,
  ATTENDED_STATUSES,
} from '../services/attendance.service.js';
import { getAtRiskStudents } from '../services/intervention.service.js';
import { PROXY_ACTIONS } from '../utils/validation.js';

/**
 * Admin dashboard: institution metrics, 14-day trend, department comparison,
 * risk segmentation and the latest security incidents.
 */
export async function getDashboard(req, res, next) {
  try {
    const [metrics, atRiskList] = await Promise.all([
      getInstitutionMetrics(),
      getAtRiskStudents(),
    ]);

    // 1. Daily activity for the last 14 days (real records only).
    const days = 14;
    const now = new Date();
    const trendData = [];

    for (let i = days - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, 0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const [present, late, flagged] = await Promise.all([
        prisma.attendanceRecord.count({
          where: { timestamp: { gte: start, lt: end }, status: 'PRESENT' },
        }),
        prisma.attendanceRecord.count({
          where: { timestamp: { gte: start, lt: end }, status: 'LATE' },
        }),
        prisma.attendanceRecord.count({
          where: { timestamp: { gte: start, lt: end }, status: 'FLAGGED_PROXY' },
        }),
      ]);

      trendData.push({
        date: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        present,
        late,
        flagged,
      });
    }

    // 2. Department comparison using real attendance records.
    const [courseDepartments, studentDepartments] = await Promise.all([
      prisma.course.findMany({ select: { department: true }, distinct: ['department'] }),
      prisma.user.findMany({
        where: { role: 'STUDENT', department: { not: null } },
        select: { department: true },
        distinct: ['department'],
      }),
    ]);

    const departments = [
      ...new Set([
        ...courseDepartments.map((d) => d.department),
        ...studentDepartments.map((d) => d.department),
      ]),
    ].filter(Boolean);

    const deptComparison = await Promise.all(
      departments.map(async (dept) => {
        const [students, courses, totalRecords, attendedRecords] = await Promise.all([
          prisma.user.count({ where: { department: dept, role: 'STUDENT' } }),
          prisma.course.count({ where: { department: dept } }),
          prisma.attendanceRecord.count({
            where: {
              session: { endTime: { not: null }, course: { department: dept } },
            },
          }),
          prisma.attendanceRecord.count({
            where: {
              session: { endTime: { not: null }, course: { department: dept } },
              status: { in: ATTENDED_STATUSES },
            },
          }),
        ]);

        return {
          department: dept,
          students,
          courses,
          attendanceRate: totalRecords > 0 ? Number(((attendedRecords / totalRecords) * 100).toFixed(1)) : 0,
          riskCount: atRiskList.filter((s) => s.department === dept).length,
        };
      })
    );

    // 3. Risk segmentation.
    const criticalCount = atRiskList.filter((s) => s.riskLevel === 'CRITICAL').length;
    const warningCount = atRiskList.filter((s) => s.riskLevel === 'WARNING').length;
    const cautionCount = atRiskList.filter((s) => s.riskLevel === 'CAUTION').length;
    const normalCount = Math.max(0, metrics.totalStudents - atRiskList.length);

    const riskBreakdown = [
      { name: 'Normal (≥75%)', value: normalCount, color: '#10B981' },
      { name: 'Caution (65-75%)', value: cautionCount, color: '#F59E0B' },
      { name: 'Warning (50-65%)', value: warningCount, color: '#F97316' },
      { name: 'Critical (<50%)', value: criticalCount, color: '#EF4444' },
    ];

    // 4. Latest security incidents.
    const recentAlerts = await prisma.proxyAlert.findMany({
      take: 6,
      orderBy: { flaggedAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, rollNumber: true, email: true, department: true } },
        session: { include: { course: { select: { code: true, name: true } } } },
      },
    });

    return res.json({
      success: true,
      metrics,
      trendData,
      deptComparison,
      riskBreakdown,
      recentAlerts,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * List proxy alerts with optional resolved filter and search.
 */
export async function getProxyAlerts(req, res, next) {
  try {
    const { resolved, search } = req.query;
    const where = {};

    if (resolved === 'true' || resolved === 'false') {
      where.resolved = resolved === 'true';
    }

    if (typeof search === 'string' && search.trim()) {
      const term = search.trim();
      where.OR = [
        { student: { name: { contains: term, mode: 'insensitive' } } },
        { student: { rollNumber: { contains: term, mode: 'insensitive' } } },
        { reason: { contains: term, mode: 'insensitive' } },
      ];
    }

    const alerts = await prisma.proxyAlert.findMany({
      where,
      orderBy: { flaggedAt: 'desc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            department: true,
            avatarUrl: true,
          },
        },
        session: {
          include: { course: { select: { code: true, name: true } } },
        },
      },
    });

    return res.json({ success: true, alerts });
  } catch (error) {
    next(error);
  }
}

/**
 * Resolve a proxy alert.
 * APPROVE -> record becomes PRESENT, BLOCK -> record becomes ABSENT,
 * FLAG -> record stays FLAGGED_PROXY and the alert stays open.
 */
export async function updateProxyAlert(req, res, next) {
  try {
    const { id } = req.params;
    const action = typeof req.body.action === 'string' ? req.body.action.toUpperCase() : null;

    if (action !== null && !PROXY_ACTIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Use one of: ${PROXY_ACTIONS.join(', ')}`,
      });
    }

    const alert = await prisma.proxyAlert.findUnique({
      where: { id },
      include: { student: true, session: { include: { course: true } } },
    });

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Proxy alert not found' });
    }

    const shouldResolve = action === 'APPROVE' || action === 'BLOCK';
    const explicitResolved = typeof req.body.resolved === 'boolean' ? req.body.resolved : undefined;

    const result = await prisma.$transaction(async (tx) => {
      let record = null;

      if (action === 'APPROVE' || action === 'BLOCK') {
        const status = action === 'APPROVE' ? 'PRESENT' : 'ABSENT';
        const method = action === 'APPROVE' ? 'ADMIN_OVERRIDE' : 'ADMIN_BLOCKED';

        record = await tx.attendanceRecord.upsert({
          where: {
            sessionId_studentId: { sessionId: alert.sessionId, studentId: alert.studentId },
          },
          update: { status, method },
          create: {
            sessionId: alert.sessionId,
            studentId: alert.studentId,
            status,
            method,
          },
        });
      }

      const updatedAlert = await tx.proxyAlert.update({
        where: { id },
        data: { resolved: shouldResolve ? true : explicitResolved ?? alert.resolved },
      });

      return { updatedAlert, record };
    });

    return res.json({
      success: true,
      message: `Proxy alert updated${action ? ` with action: ${action}` : ''}`,
      alert: result.updatedAlert,
      record: result.record,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Audit trail of manual overrides and administrative actions.
 */
export async function getAuditLogs(req, res, next) {
  try {
    const manualRecords = await prisma.attendanceRecord.findMany({
      where: { method: { in: ['MANUAL', 'ADMIN_OVERRIDE', 'ADMIN_BLOCKED'] } },
      orderBy: { timestamp: 'desc' },
      take: 100,
      include: {
        student: { select: { id: true, name: true, rollNumber: true, email: true, department: true } },
        session: {
          include: {
            course: {
              include: { faculty: { select: { id: true, name: true, email: true } } },
            },
          },
        },
      },
    });

    const logs = manualRecords.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      action: r.method,
      statusAssigned: r.status,
      studentName: r.student.name,
      studentRoll: r.student.rollNumber || 'N/A',
      courseName: r.session.course.name,
      courseCode: r.session.course.code,
      performedBy:
        r.method === 'MANUAL'
          ? r.session.course.faculty?.name || 'Faculty'
          : 'Administrator',
      ipAddress: r.ipAddress || 'Internal',
    }));

    return res.json({ success: true, logs });
  } catch (error) {
    next(error);
  }
}
