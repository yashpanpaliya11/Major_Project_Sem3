import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  ShieldAlert,
  FileText,
  BookOpen,
  Rocket,
  Radio,
  AlertTriangle,
  QrCode,
  CalendarDays,
  ScanFace,
  GraduationCap,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import Badge from "../components/common/Badge";

const navLinks = {
  ADMIN: [
    { label: "Admin Metrics", path: "/admin", icon: LayoutDashboard },
    { label: "Proxy Threat Center", path: "/admin/proxy-alerts", icon: ShieldAlert },
    { label: "System Audit Logs", path: "/admin/audit-logs", icon: FileText },
    { label: "Manage Courses", path: "/admin/manage-courses", icon: BookOpen },
  ],
  FACULTY: [
    { label: "Faculty Overview", path: "/faculty", icon: LayoutDashboard },
    { label: "Launch Lecture Session", path: "/faculty/launch-session", icon: Rocket },
    { label: "Live Session & Feed", path: "/faculty/live-attendance", icon: Radio },
    { label: "Student Risk Panel (<75%)", path: "/faculty/student-risk", icon: AlertTriangle },
  ],
  STUDENT: [
    { label: "Student Dashboard", path: "/student", icon: LayoutDashboard },
    { label: "Scan & Attend (Live QR)", path: "/student/scan-attend", icon: QrCode },
    { label: "Attendance History", path: "/student/attendance-history", icon: CalendarDays },
    { label: "Face Rec Verification", path: "/student/face-verify", icon: ScanFace },
  ],
};

export default function Sidebar({ onCloseMobile }) {
  const { user } = useAuth();
  const links = navLinks[user?.role] || [];

  return (
    <aside className="flex flex-col h-full w-64 bg-white border-r border-sky-100 select-none overflow-hidden">
      {/* Brand */}
      <div className="p-5 border-b border-sky-100 flex items-center gap-3 bg-white">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-md shadow-sky-500/20 text-white">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-black tracking-tight text-sky-950">
            Edu<span className="text-sky-500">Pulse</span>
          </h1>
          <p className="text-[11px] font-bold uppercase tracking-widest text-sky-500/90 mt-0.5">
            Smart Attendance
          </p>
        </div>
      </div>

      {/* Role Banner */}
      <div className="px-5 py-3.5 border-b border-sky-100 bg-sky-50/50 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-widest text-sky-600">
          Portal View
        </span>
        <Badge variant="brand" size="sm">
          {user?.role}
        </Badge>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3.5 py-4 space-y-1 overflow-y-auto">
        {links.map((item) => {
          const isExactRoot = item.path === "/admin" || item.path === "/faculty" || item.path === "/student";

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={isExactRoot}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? "bg-sky-50 text-sky-600 border border-sky-200 shadow-sm shadow-sky-100 font-bold"
                    : "text-sky-800/80 hover:text-sky-600 hover:bg-sky-50/60"
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Area */}
      <div className="p-4 border-t border-sky-100 bg-sky-50/30">
        <div className="flex items-center gap-3">
          <img
            src={user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
            alt="Avatar"
            className="w-10 h-10 rounded-full bg-sky-100 border border-sky-200 object-cover"
          />
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-sky-950 truncate">{user?.name}</p>
            <p className="text-xs text-sky-500 truncate font-medium">{user?.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
