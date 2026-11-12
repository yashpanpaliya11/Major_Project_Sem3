/**
 * End-to-end smoke test for the EduPulse API and Socket.io authorization.
 *
 * Requires a running server and a seeded database:
 *   npm run db:seed
 *   npm run dev          # or npm start
 *   npm run smoke
 *
 * The test creates a temporary course, exercises the full attendance flow,
 * and deletes the course afterwards.
 */
import { io as createSocket } from 'socket.io-client';

const BASE = process.env.SMOKE_BASE_URL || 'http://localhost:5001';
const results = [];

let adminToken = null;
let tempCourseId = null;

function waitForApiReady(baseUrl = BASE) {
  return new Promise((resolve) => {
    const maxAttempts = 30;
    let attempts = 0;
    (function poll() {
      fetch(`${baseUrl}/api/health`)
        .then((res) => res.ok)
        .then((ok) => {
          if (ok) resolve();
          else if (++attempts < maxAttempts) setTimeout(poll, 500);
          else resolve();
        })
        .catch(() => {
          if (++attempts < maxAttempts) setTimeout(poll, 500);
          else resolve();
        });
    })();
  });
}

function check(name, condition, detail = '') {
  results.push({ name, passed: Boolean(condition), detail });
  console.log(`${condition ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  return { status: res.status, data };
}

await waitForApiReady();

async function login(email, password) {
  const res = await api('/api/auth/login', { method: 'POST', body: { email, password } });
  return { token: res.data?.token, status: res.status, user: res.data?.user };
}

function waitForEvent(socket, event, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      socket.off(event, handler);
      resolve(null);
    }, timeoutMs);

    const handler = (payload) => {
      clearTimeout(timeout);
      socket.off(event, handler);
      resolve(payload);
    };

    socket.on(event, handler);
  });
}

async function main() {
  console.log(`\nEduPulse smoke test → ${BASE}\n`);

  // --- Health & auth -----------------------------------------------------
  const health = await api('/api/health');
  check('health endpoint reports database up', health.status === 200 && health.data?.database === 'up');

  const admin = await login('admin@edupulse.com', 'admin123');
  const faculty1 = await login('faculty1@edupulse.com', 'faculty123');
  const faculty2 = await login('faculty2@edupulse.com', 'faculty123');
  const student1 = await login('student1@edupulse.com', 'student123');
  const student2 = await login('student2@edupulse.com', 'student123');
  const student3 = await login('student3@edupulse.com', 'student123');
  const student4 = await login('student4@edupulse.com', 'student123');
  const student6 = await login('student6@edupulse.com', 'student123');

  check('admin login', admin.status === 200 && Boolean(admin.token));
  check('faculty login', faculty1.status === 200 && Boolean(faculty1.token));
  check('student login', student1.status === 200 && Boolean(student1.token));

  adminToken = admin.token;

  const wrongPassword = await api('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@edupulse.com', password: 'wrong-password' },
  });
  check('wrong password rejected', wrongPassword.status === 401);

  const noAuth = await api('/api/admin/dashboard');
  check('unauthenticated request rejected', noAuth.status === 401);

  const studentOnAdmin = await api('/api/admin/dashboard', { token: student1.token });
  check('student blocked from admin API', studentOnAdmin.status === 403);

  const adminSignup = await api('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Fake Admin',
      email: `fake-admin-${Date.now()}@example.com`,
      password: 'password123',
      role: 'ADMIN',
    },
  });
  check('public admin registration blocked', adminSignup.status === 403);

  // '12345678' is exactly 8 chars = the minimum valid length, so registration
  // must succeed with 201. A 7-char password (e.g. '1234567') must be rejected 400.
  const weakPassword = await api('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Valid Minimum Password',
      email: `weak-${Date.now()}@example.com`,
      password: '12345678',
      role: 'STUDENT',
    },
  });
  check('8-char password registers successfully', weakPassword.status === 201,
    `got status ${weakPassword.status}, body ${JSON.stringify(weakPassword.data)}`);
  console.log('[debug] weakPassword status:', weakPassword.status, 'body:', JSON.stringify(weakPassword.data));

  // --- Dashboards --------------------------------------------------------
  const adminDashboard = await api('/api/admin/dashboard', { token: admin.token });
  check(
    'admin dashboard returns real metrics',
    adminDashboard.status === 200 &&
      adminDashboard.data?.metrics?.totalStudents >= 15 &&
      adminDashboard.data?.metrics?.overallPercentage > 0 &&
      adminDashboard.data?.trendData?.length === 14
  );

  // Use a student with a known absence so the old "everyone is 100%" bug
  // would be caught here.
  const studentDashboard = await api('/api/student/dashboard', { token: student2.token });
  const overall = studentDashboard.data?.overallStats;
  check(
    'student dashboard computes attendance from lectures held',
    studentDashboard.status === 200 &&
      overall?.totalSessions > 0 &&
      overall?.absent > 0 &&
      overall?.percentage < 100 &&
      overall?.percentage > 0
  );

  const risk = await api('/api/faculty/student-risk', { token: admin.token });
  check(
    'risk detection finds seeded students below 75%',
    risk.status === 200 &&
      risk.data?.atRisk?.some((s) => s.riskLevel === 'CRITICAL') &&
      risk.data?.atRisk?.every((s) => s.overallPercentage < 100)
  );

  // --- Temporary course / enrollment ------------------------------------
  const facultyId = faculty1.user.id;

  const createCourse = await api('/api/courses', {
    method: 'POST',
    token: admin.token,
    body: {
      code: `SMK${Date.now().toString().slice(-5)}`,
      name: 'Smoke Test Course',
      department: 'Computer Science',
      facultyId,
    },
  });
  tempCourseId = createCourse.data?.course?.id;
  check('course creation', createCourse.status === 201 && Boolean(tempCourseId));

  // student4 is deliberately enrolled but never checks in, so the end-session
  // flow must create an ABSENT record for them.
  for (const student of [student1, student2, student3, student4]) {
    const enrollment = await api('/api/courses/enroll', {
      method: 'POST',
      token: admin.token,
      body: { courseId: tempCourseId, studentId: student.user.id },
    });
    check(`enroll ${student.user.name}`, enrollment.status === 201);
  }

  const duplicateEnrollment = await api('/api/courses/enroll', {
    method: 'POST',
    token: admin.token,
    body: { courseId: tempCourseId, studentId: student1.user.id },
  });
  check('duplicate enrollment rejected', duplicateEnrollment.status === 409);

  // --- Session lifecycle -------------------------------------------------
  const badRadius = await api('/api/faculty/sessions', {
    method: 'POST',
    token: faculty1.token,
    body: { courseId: tempCourseId, radiusMeters: 9999 },
  });
  check('invalid geofence radius rejected', badRadius.status === 400);

  const sessionRes = await api('/api/faculty/sessions', {
    method: 'POST',
    token: faculty1.token,
    body: {
      courseId: tempCourseId,
      sessionType: 'IN_PERSON',
      latitude: 12.9716,
      longitude: 77.5946,
      radiusMeters: 50,
    },
  });

  const session = sessionRes.data?.session;
  const sessionId = session?.id;
  check('session creation', sessionRes.status === 201 && Boolean(sessionId));

  const duplicateSession = await api('/api/faculty/sessions', {
    method: 'POST',
    token: faculty1.token,
    body: { courseId: tempCourseId },
  });
  check('second active session for same course rejected', duplicateSession.status === 409);

  const qrToken = session?.activeQrToken;
  check('session has a rolling QR token', typeof qrToken === 'string' && qrToken.length > 20);

  const wrongFaculty = await api(`/api/faculty/sessions/${sessionId}/end`, {
    method: 'POST',
    token: faculty2.token,
  });
  check('other faculty cannot end the session', wrongFaculty.status === 403);

  // --- Check-in flow -----------------------------------------------------
  const inClass = await api('/api/student/scan-qr', {
    method: 'POST',
    token: student1.token,
    body: {
      qrToken,
      latitude: 12.9716,
      longitude: 77.5946,
      deviceInfo: 'fp_smoke_student1',
    },
  });
  check('valid in-class QR scan marks PRESENT', inClass.status === 200 && inClass.data?.record?.status === 'PRESENT');

  const duplicateScan = await api('/api/student/scan-qr', {
    method: 'POST',
    token: student1.token,
    body: {
      qrToken,
      latitude: 12.9716,
      longitude: 77.5946,
      deviceInfo: 'fp_smoke_student1',
    },
  });
  check('duplicate check-in rejected', duplicateScan.status === 409);

  const notEnrolled = await api('/api/student/scan-qr', {
    method: 'POST',
    token: student6.token,
    body: {
      qrToken,
      latitude: 12.9716,
      longitude: 77.5946,
      deviceInfo: 'fp_smoke_student6',
    },
  });
  check('student outside the course cannot check in', notEnrolled.status === 403);

  const farAway = await api('/api/student/scan-qr', {
    method: 'POST',
    token: student2.token,
    body: {
      qrToken,
      latitude: 12.9816,
      longitude: 77.6046,
      deviceInfo: 'fp_smoke_student2',
    },
  });
  check(
    'geofence violation is quarantined',
    farAway.status === 403 &&
      farAway.data?.isProxyRisk === true &&
      farAway.data?.reasons?.some((r) => r.toLowerCase().includes('away'))
  );

  const reusedDevice = await api('/api/student/scan-qr', {
    method: 'POST',
    token: student3.token,
    body: {
      qrToken,
      latitude: 12.9716,
      longitude: 77.5946,
      deviceInfo: 'fp_smoke_student1',
    },
  });
  check('shared device fingerprint is quarantined', reusedDevice.status === 403);

  const reopened = await api('/api/student/face-verify', {
    method: 'POST',
    token: student2.token,
    body: {
      sessionId,
      faceDataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(200),
      deviceInfo: 'fp_smoke_student2',
    },
  });
  check('face verification records attendance', reopened.status === 200 && reopened.data?.record?.method === 'FACIAL_REC');

  const liveBeforeEnd = await api(`/api/faculty/sessions/${sessionId}/live`, { token: faculty1.token });
  check(
    'live feed reports check-ins',
    liveBeforeEnd.status === 200 && liveBeforeEnd.data?.stats?.presentCount >= 2
  );

  // --- Proxy resolution --------------------------------------------------
  const alerts = await api('/api/admin/proxy-alerts?resolved=false', { token: admin.token });
  const alert = alerts.data?.alerts?.find(
    (a) =>
      a.sessionId === sessionId &&
      (a.student?.id === student2.user.id || a.student?.name === student2.user.name)
  );

  check('proxy alert created for geofence breach', Boolean(alert));

  if (alert) {
    const approve = await api(`/api/admin/proxy-alerts/${alert.id}`, {
      method: 'PATCH',
      token: admin.token,
      body: { action: 'APPROVE' },
    });
    check(
      'admin can approve a quarantined attempt',
      approve.status === 200 && approve.data?.record?.status === 'PRESENT'
    );
  }

  // --- Manual override ---------------------------------------------------
  const override = await api('/api/faculty/override', {
    method: 'POST',
    token: faculty1.token,
    body: { sessionId, studentId: student2.user.id, status: 'LATE' },
  });
  check('faculty manual override', override.status === 200 && override.data?.record?.status === 'LATE');

  const badOverride = await api('/api/faculty/override', {
    method: 'POST',
    token: faculty1.token,
    body: { sessionId, studentId: student6.user.id, status: 'PRESENT' },
  });
  check('override for non-enrolled student rejected', badOverride.status === 400);

  // --- Socket authorization ---------------------------------------------
  const anonymous = createSocket(BASE, { auth: {}, reconnection: false, timeout: 4000 });
  const anonymousError = await waitForEvent(anonymous, 'connect_error');
  anonymous.close();
  check('socket rejects unauthenticated connections', Boolean(anonymousError));

  const facultySocket = createSocket(BASE, {
    auth: { token: faculty1.token },
    reconnection: false,
    transports: ['websocket'],
  });
  await waitForEvent(facultySocket, 'connect');
  facultySocket.emit('join:session', { sessionId });
  const qrRefresh = await waitForEvent(facultySocket, 'qr:refresh');
  check('faculty receives rotating QR over socket', Boolean(qrRefresh?.qrPayload));
  facultySocket.close();

  const studentSocket = createSocket(BASE, {
    auth: { token: student1.token },
    reconnection: false,
    transports: ['websocket'],
  });
  await waitForEvent(studentSocket, 'connect');
  studentSocket.emit('join:session', { sessionId });
  const forbidden = await waitForEvent(studentSocket, 'session:error');
  check('student cannot join a faculty session room', Boolean(forbidden?.message));
  studentSocket.close();

  // --- End session & absence recording -----------------------------------
  const end = await api(`/api/faculty/sessions/${sessionId}/end`, {
    method: 'POST',
    token: faculty1.token,
  });
  check(
    'ending a session records absences for missing students',
    end.status === 200 && end.data?.absentCreated >= 1
  );

  const liveAfterEnd = await api(`/api/faculty/sessions/${sessionId}/live`, { token: faculty1.token });
  check(
    'live stats include absences after end',
    liveAfterEnd.data?.stats?.absentCount >= 1 &&
      liveAfterEnd.data?.stats?.attendanceRate > 0
  );

  const report = await api(`/api/attendance/report?courseId=${tempCourseId}`, {
    token: admin.token,
  });
  check(
    'report contains present and absent rows',
    report.status === 200 &&
      report.data?.records?.some((r) => r.status === 'ABSENT') &&
      report.data?.records?.some((r) => r.status === 'PRESENT')
  );

  const notice = await api('/api/attendance/generate-alert', {
    method: 'POST',
    token: admin.token,
    body: { studentId: student3.user.id, courseId: tempCourseId },
  });
  check('intervention notice generated', notice.status === 200 && /attendance/i.test(notice.data?.notice?.content || ''));

  // --- Course privacy & online mode --------------------------------------
  const outsiderCourse = await api(`/api/courses/${tempCourseId}`, { token: student6.token });
  check('student cannot inspect a course roster they are not enrolled in', outsiderCourse.status === 403);

  const onlineSessionRes = await api('/api/faculty/sessions', {
    method: 'POST',
    token: faculty1.token,
    body: {
      courseId: tempCourseId,
      sessionType: 'ONLINE',
      latitude: 12.9716,
      longitude: 77.5946,
    },
  });
  check(
    'online session disables the classroom geofence',
    onlineSessionRes.status === 201 && onlineSessionRes.data?.session?.latitude === null
  );

  const onlineSessionId = onlineSessionRes.data?.session?.id;
  const remoteScan = await api('/api/student/scan-qr', {
    method: 'POST',
    token: student1.token,
    body: {
      qrToken: onlineSessionRes.data?.session?.activeQrToken,
      latitude: 40.7128,
      longitude: -74.006,
      deviceInfo: 'fp_smoke_online_student1',
    },
  });
  check('remote check-in is accepted for an online lecture', remoteScan.status === 200);

  if (onlineSessionId) {
    await api(`/api/faculty/sessions/${onlineSessionId}/end`, {
      method: 'POST',
      token: faculty1.token,
    });
  }

  // --- Cleanup -----------------------------------------------------------
  const deleted = await api(`/api/courses/${tempCourseId}`, {
    method: 'DELETE',
    token: admin.token,
  });
  check('course deletion cascades related data', deleted.status === 200);

  const gone = await api(`/api/courses/${tempCourseId}`, { token: admin.token });
  check('deleted course is gone', gone.status === 404);
  tempCourseId = null;

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.error('Failed checks:', failed.map((f) => f.name).join(', '));
    process.exitCode = 1;
  }
}

main()
  .catch(async (error) => {
    console.error('\nSmoke test crashed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (tempCourseId && adminToken) {
      await api(`/api/courses/${tempCourseId}`, { method: 'DELETE', token: adminToken }).catch(() => {});
    }
    setTimeout(() => process.exit(process.exitCode || 0), 500);
  });
