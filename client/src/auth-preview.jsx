import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AuthLayout from './layouts/AuthLayout';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import './index.css';

function showPreviewNotice(event) {
  event.preventDefault();
  event.stopPropagation();
  toast('Account actions will be available when the server is connected.');
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Toaster />
        <p className="bg-slate-900 px-4 py-2 text-center text-sm text-slate-200">
          Frontend preview. Account actions require the server.
        </p>
        <div onSubmitCapture={showPreviewNotice}>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
