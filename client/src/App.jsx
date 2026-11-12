import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { useAuth } from './hooks/useAuth';

import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoadingSpinner from './components/common/LoadingSpinner';

// Route-level code splitting keeps the camera scanner and charting library out
// of the initial bundle.
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ProxyAlerts = lazy(() => import('./pages/admin/ProxyAlerts'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const ManageCourses = lazy(() => import('./pages/admin/ManageCourses'));

const FacultyDashboard = lazy(() => import('./pages/faculty/FacultyDashboard'));
const SessionLauncher = lazy(() => import('./pages/faculty/SessionLauncher'));
const LiveAttendance = lazy(() => import('./pages/faculty/LiveAttendance'));
const StudentRisk = lazy(() => import('./pages/faculty/StudentRisk'));

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const ScanAttend = lazy(() => import('./pages/student/ScanAttend'));
const AttendanceHistory = lazy(() => import('./pages/student/AttendanceHistory'));
const FaceVerify = lazy(() => import('./pages/student/FaceVerify'));

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'FACULTY') return <Navigate to="/faculty" replace />;
  return <Navigate to="/student" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3500,
              style: {
                background: '#0F172A',
                color: '#F8FAFC',
                border: '1px solid #334155',
                borderRadius: '16px',
                fontSize: '13px',
              },
            }}
          />

          <Suspense
            fallback={
              <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <LoadingSpinner size="lg" text="Loading portal..." />
              </div>
            }
          >
            <Routes>
              {/* Public authentication routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              </Route>

              {/* Admin portal */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="proxy-alerts" element={<ProxyAlerts />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="manage-courses" element={<ManageCourses />} />
              </Route>

              {/* Faculty portal */}
              <Route
                path="/faculty"
                element={
                  <ProtectedRoute allowedRoles={['FACULTY']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<FacultyDashboard />} />
                <Route path="launch-session" element={<SessionLauncher />} />
                <Route path="live-attendance" element={<LiveAttendance />} />
                <Route path="student-risk" element={<StudentRisk />} />
              </Route>

              {/* Student portal */}
              <Route
                path="/student"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<StudentDashboard />} />
                <Route path="scan-attend" element={<ScanAttend />} />
                <Route path="attendance-history" element={<AttendanceHistory />} />
                <Route path="face-verify" element={<FaceVerify />} />
              </Route>

              {/* Root / catch-all */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </Suspense>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
