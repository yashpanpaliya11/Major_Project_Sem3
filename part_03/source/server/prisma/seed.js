import '../src/config/env.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Deterministic PRNG so repeated seeds produce the same demo dataset.
let rngState = 0x2f6e2b1;
function rand() {
  rngState |= 0;
  rngState = (rngState + 0x6d2b79f5) | 0;
  let t = Math.imul(rngState ^ (rngState >>> 15), 1 | rngState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Exact attendance targets keep the demo risk buckets stable across seeds.
const ATTENDANCE_TARGETS = {
  '2023EC06': { present: 0.31, late: 0.04 }, // ~37.5% — CRITICAL
  '2023CS06': { present: 0.48, late: 0.06 }, // ~58.3% — WARNING
  '2023EC04': { present: 0.62, late: 0.06 }, // ~68.8% — CAUTION
  default: { present: 0.85, late: 0.07 }, // ~92-94% — healthy
};

function buildStatusQueue(total, target) {
  const presentCount = Math.min(total, Math.round(total * target.present));
  const lateCount = Math.min(total - presentCount, Math.round(total * target.late));
  const absentCount = Math.max(0, total - presentCount - lateCount);

  const queue = [
    ...Array(presentCount).fill('PRESENT'),
    ...Array(lateCount).fill('LATE'),
    ...Array(absentCount).fill('ABSENT'),
  ];

  // Shuffle so attendance is not clustered at the start of the term.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }

  return queue;
}

function daysAgoAt(days, hour) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  console.log('🌱 Seeding EduPulse...');

  await prisma.proxyAlert.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.lectureSession.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  // --- Users -------------------------------------------------------------
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const facultyPasswordHash = await bcrypt.hash('faculty123', 10);
  const studentPasswordHash = await bcrypt.hash('student123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Dr. Rajesh Sharma (Dean)',
      email: 'admin@edupulse.com',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      department: 'Academic Administration',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RajeshAdmin',
    },
  });

  const facultyData = [
    { name: 'Prof. Ananya Iyer', email: 'faculty1@edupulse.com', department: 'Computer Science', seed: 'AnanyaIyer' },
    { name: 'Dr. Vikramaditya Rao', email: 'faculty2@edupulse.com', department: 'Electronics & Comm', seed: 'Vikramaditya' },
    { name: 'Dr. Meera Nambiar', email: 'faculty3@edupulse.com', department: 'Mathematics', seed: 'MeeraNambiar' },
  ];

  const facultyUsers = [];
  for (const f of facultyData) {
    facultyUsers.push(
      await prisma.user.create({
        data: {
          name: f.name,
          email: f.email,
          passwordHash: facultyPasswordHash,
          role: 'FACULTY',
          department: f.department,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.seed}`,
        },
      })
    );
  }

  const studentData = [
    { name: 'Aarav Patel', roll: '2023CS01', dept: 'Computer Science' },
    { name: 'Diya Sen', roll: '2023CS02', dept: 'Computer Science' },
    { name: 'Rohan Deshmukh', roll: '2023CS03', dept: 'Computer Science' },
    { name: 'Kavya Pillai', roll: '2023CS04', dept: 'Computer Science' },
    { name: 'Ishaan Verma', roll: '2023CS05', dept: 'Computer Science' },
    { name: 'Sneha Kulkarni', roll: '2023EC01', dept: 'Electronics & Comm' },
    { name: 'Arjun Nair', roll: '2023EC02', dept: 'Electronics & Comm' },
    { name: 'Pooja Bhatt', roll: '2023EC03', dept: 'Electronics & Comm' },
    { name: 'Aditya Reddy', roll: '2023EC04', dept: 'Electronics & Comm' },
    { name: 'Megha Sundaram', roll: '2023EC05', dept: 'Electronics & Comm' },
    { name: 'Tanmay Joshi', roll: '2023MA01', dept: 'Mathematics' },
    { name: 'Anika Roy', roll: '2023MA02', dept: 'Mathematics' },
    { name: 'Harsh Vardhan', roll: '2023MA03', dept: 'Mathematics' },
    { name: 'Priya Chawla', roll: '2023CS06', dept: 'Computer Science' },
    { name: 'Kabir Malhotra', roll: '2023EC06', dept: 'Electronics & Comm' },
  ];

  const studentUsers = [];
  for (let i = 0; i < studentData.length; i++) {
    const s = studentData[i];
    studentUsers.push(
      await prisma.user.create({
        data: {
          name: s.name,
          email: `student${i + 1}@edupulse.com`,
          passwordHash: studentPasswordHash,
          role: 'STUDENT',
          department: s.dept,
          rollNumber: s.roll,
          avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.roll}`,
        },
      })
    );
  }

  console.log(`✅ ${1 + facultyUsers.length + studentUsers.length} users created`);

  // --- Courses -----------------------------------------------------------
  const coursesData = [
    { code: 'CS301', name: 'Distributed Systems & Cloud Computing', department: 'Computer Science', facultyId: facultyUsers[0].id },
    { code: 'CS302', name: 'Artificial Intelligence & Neural Networks', department: 'Computer Science', facultyId: facultyUsers[0].id },
    { code: 'EC204', name: 'Embedded Systems & IoT Architectures', department: 'Electronics & Comm', facultyId: facultyUsers[1].id },
    { code: 'EC308', name: 'Digital Signal Processing', department: 'Electronics & Comm', facultyId: facultyUsers[1].id },
    { code: 'MA201', name: 'Linear Algebra & Optimization', department: 'Mathematics', facultyId: facultyUsers[2].id },
    { code: 'MA305', name: 'Probability & Stochastic Processes', department: 'Mathematics', facultyId: facultyUsers[2].id },
  ];

  const courses = [];
  for (const c of coursesData) {
    courses.push(await prisma.course.create({ data: c }));
  }

  // --- Enrollments -------------------------------------------------------
  for (let i = 0; i < studentUsers.length; i++) {
    const student = studentUsers[i];
    let assigned;

    if (student.department === 'Computer Science') {
      assigned = [courses[0], courses[1], courses[4]];
    } else if (student.department === 'Electronics & Comm') {
      assigned = [courses[2], courses[3], courses[4]];
    } else {
      assigned = [courses[4], courses[5], courses[0]];
    }

    const elective = i % 2 === 0 ? courses[5] : courses[1];
    if (!assigned.some((c) => c.id === elective.id)) assigned.push(elective);

    for (const course of assigned) {
      await prisma.enrollment.create({
        data: { studentId: student.id, courseId: course.id },
      });
    }
  }

  console.log('✅ Enrollments created');

  // --- Completed lectures ------------------------------------------------
  // Four completed lectures per course over the previous two weeks.
  const completedSessions = [];
  for (let ci = 0; ci < courses.length; ci++) {
    for (let j = 0; j < 4; j++) {
      const startTime = daysAgoAt(j * 3 + 1, 10 + ci);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      completedSessions.push(
        await prisma.lectureSession.create({
          data: {
            courseId: courses[ci].id,
            startTime,
            endTime,
            sessionType: j % 3 === 0 ? 'HYBRID' : j % 4 === 0 ? 'ONLINE' : 'IN_PERSON',
            latitude: 12.9716,
            longitude: 77.5946,
            radiusMeters: 50,
          },
        })
      );
    }
  }

  // Pre-compute one status queue per student with exact present/late/absent counts.
  const sessionsByCourse = new Map();
  for (const session of completedSessions) {
    if (!sessionsByCourse.has(session.courseId)) sessionsByCourse.set(session.courseId, []);
    sessionsByCourse.get(session.courseId).push(session);
  }

  const statusQueues = new Map();
  for (const student of studentUsers) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id },
      select: { courseId: true },
    });

    const total = enrollments.reduce(
      (sum, enrollment) => sum + (sessionsByCourse.get(enrollment.courseId)?.length || 0),
      0
    );
    const target = ATTENDANCE_TARGETS[student.rollNumber] || ATTENDANCE_TARGETS.default;
    statusQueues.set(student.id, buildStatusQueue(total, target));
  }

  let recordCount = 0;
  for (const session of completedSessions) {
    const enrollments = await prisma.enrollment.findMany({
      where: { courseId: session.courseId },
      include: { student: true },
    });

    const records = enrollments.map((enrollment) => {
      const status = statusQueues.get(enrollment.studentId)?.shift() || 'ABSENT';
      let method = 'QR_CODE';
      if (status === 'PRESENT' && rand() < 0.22) method = 'FACIAL_REC';
      if (status === 'ABSENT') method = 'AUTO_ROLL_CALL';

      return {
        sessionId: session.id,
        studentId: enrollment.studentId,
        timestamp: new Date(session.startTime.getTime() + Math.floor(rand() * 12 * 60 * 1000)),
        status,
        method,
        ipAddress: `192.168.10.${10 + studentUsers.findIndex((s) => s.id === enrollment.studentId)}`,
        deviceInfo: `fp_seed_${enrollment.student.rollNumber}`,
      };
    });

    if (records.length > 0) {
      const created = await prisma.attendanceRecord.createMany({ data: records });
      recordCount += created.count;
    }
  }

  console.log(`✅ ${completedSessions.length} completed lectures, ${recordCount} attendance records`);

  // --- Active lecture ----------------------------------------------------
  const activeSession = await prisma.lectureSession.create({
    data: {
      courseId: courses[0].id, // CS301
      startTime: new Date(),
      endTime: null,
      sessionType: 'IN_PERSON',
      latitude: 12.9716,
      longitude: 77.5946,
      radiusMeters: 60,
    },
  });

  console.log('✅ 1 active lecture session for CS301:', activeSession.id);

  // --- Proxy incidents ---------------------------------------------------
  const studentByRoll = (roll) => studentUsers.find((s) => s.rollNumber === roll);

  // Prefer a lecture the student actually missed; converting ABSENT to
  // FLAGGED_PROXY keeps the attendance percentage intact.
  async function findAbsentRecord(studentId, preferredCourseId) {
    const baseWhere = { studentId, status: 'ABSENT', session: { endTime: { not: null } } };

    const preferred = preferredCourseId
      ? await prisma.attendanceRecord.findFirst({
          where: { ...baseWhere, session: { ...baseWhere.session, courseId: preferredCourseId } },
          include: { session: true },
        })
      : null;

    return (
      preferred ||
      prisma.attendanceRecord.findFirst({ where: baseWhere, include: { session: true } })
    );
  }

  const incidents = [
    {
      student: studentByRoll('2023EC06'),
      courseId: courses[2].id, // EC204
      reason: 'Student is 1420m away from class (max: 50m)',
      resolved: false,
    },
    {
      student: studentByRoll('2023CS06'),
      courseId: courses[0].id, // CS301
      reason: 'This device was already used to check in another student for this lecture',
      resolved: false,
    },
    {
      student: studentByRoll('2023CS05'),
      courseId: courses[0].id, // CS301
      reason: 'Same device and network used by another student moments earlier in this lecture',
      resolved: false,
    },
    {
      student: studentByRoll('2023EC05'),
      courseId: courses[2].id, // EC204
      reason: 'QR token has expired. Scan the current code on the projector.',
      resolved: true,
    },
  ];

  let incidentCount = 0;
  for (const incident of incidents) {
    if (!incident.student) continue;

    const record = await findAbsentRecord(incident.student.id, incident.courseId);
    if (!record) continue;

    await prisma.proxyAlert.create({
      data: {
        sessionId: record.sessionId,
        studentId: incident.student.id,
        reason: incident.reason,
        resolved: incident.resolved,
      },
    });

    await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        status: 'FLAGGED_PROXY',
        method: 'QR_CODE',
        ipAddress: '192.168.10.99',
        deviceInfo: 'fp_seed_shared_device',
      },
    });

    incidentCount++;
  }

  console.log(`✅ ${incidentCount} proxy incidents created`);

  // --- Audit trail -------------------------------------------------------
  const auditEntries = [
    {
      student: studentByRoll('2023CS01'),
      courseId: courses[0].id, // CS301
      method: 'MANUAL',
      ipAddress: '10.0.0.1',
      deviceInfo: 'Medical leave approved by Prof. Ananya Iyer',
    },
    {
      student: studentByRoll('2023EC02'),
      courseId: courses[3].id, // EC308
      method: 'ADMIN_OVERRIDE',
      ipAddress: '10.0.0.25',
      deviceInfo: 'Inter-university sports exemption approved by Dean office',
    },
  ];

  let auditCount = 0;
  for (const entry of auditEntries) {
    if (!entry.student) continue;

    const record = await findAbsentRecord(entry.student.id, entry.courseId);
    if (!record) continue;

    await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        status: 'PRESENT',
        method: entry.method,
        ipAddress: entry.ipAddress,
        deviceInfo: entry.deviceInfo,
      },
    });

    auditCount++;
  }

  console.log(`✅ ${auditCount} audit trail records created`);

  console.log('\n🎉 EduPulse database seeded successfully');
  console.log('--------------------------------------------------');
  console.log('  👑 Admin:   admin@edupulse.com    / admin123');
  console.log('  👨‍🏫 Faculty: faculty1@edupulse.com / faculty123');
  console.log('  🎓 Student: student1@edupulse.com  / student123');
  console.log('--------------------------------------------------');
  console.log(`  Admin user: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
