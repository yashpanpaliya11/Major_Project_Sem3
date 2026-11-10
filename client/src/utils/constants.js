export const ROLES = {
  ADMIN: 'ADMIN',
  FACULTY: 'FACULTY',
  STUDENT: 'STUDENT',
};

export const ATTENDANCE_STATUS = {
  PRESENT: 'PRESENT',
  ABSENT: 'ABSENT',
  LATE: 'LATE',
  FLAGGED_PROXY: 'FLAGGED_PROXY',
};

export const SESSION_TYPES = {
  IN_PERSON: 'IN_PERSON',
  ONLINE: 'ONLINE',
  HYBRID: 'HYBRID',
};

export const RISK_THRESHOLDS = {
  CRITICAL: 50,
  WARNING: 65,
  CAUTION: 75,
};

export const NAV_ITEMS = {
  ADMIN: [
    { label: 'Dashboard', path: '/admin', icon: 'LayoutDashboard' },
    { label: 'Proxy Alerts', path: '/admin/proxy-alerts', icon: 'ShieldAlert' },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'FileText' },
    { label: 'Manage Courses', path: '/admin/manage-courses', icon: 'BookOpen' },
  ],
  FACULTY: [
    { label: 'Dashboard', path: '/faculty', icon: 'LayoutDashboard' },
    { label: 'Launch Session', path: '/faculty/launch-session', icon: 'Rocket' },
    { label: 'Active Sessions', path: '/faculty/live-attendance', icon: 'Radio' },
    { label: 'Student Risk', path: '/faculty/student-risk', icon: 'AlertTriangle' },
  ],
  STUDENT: [
    { label: 'Dashboard', path: '/student', icon: 'LayoutDashboard' },
    { label: 'Scan & Attend', path: '/student/scan-attend', icon: 'QrCode' },
    { label: 'Attendance History', path: '/student/attendance-history', icon: 'CalendarDays' },
    { label: 'Face Verify', path: '/student/face-verify', icon: 'ScanFace' },
  ],
};
