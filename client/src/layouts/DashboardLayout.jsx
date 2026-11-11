import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import {
  LogOut,
  Wifi,
  WifiOff,
  Menu,
  X,
} from "lucide-react";
import Sidebar from "./Sidebar";
import NotificationBell from "../components/common/NotificationBell";
import EngagementPrompt from "../components/attendance/EngagementPrompt";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-shrink-0 w-64 flex-col h-full border-r border-sky-100 bg-white shadow-sm z-20">
        <Sidebar />
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-sky-950/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 flex flex-col h-full bg-white shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-sky-100">
              <h2 className="text-sm font-bold text-sky-950">Navigation</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-sky-600 hover:text-sky-950 hover:bg-sky-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/70">
        <header className="h-16 px-4 lg:px-6 bg-white/95 border-b border-sky-100 backdrop-blur-md flex items-center justify-between z-10 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-sky-600 hover:text-sky-900 hover:bg-sky-50"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 text-[11px] font-bold uppercase tracking-wider border border-sky-200">
                EduPulse Platform
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/60 border border-sky-100">
                {connected ? (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
                    <span className="text-xs font-semibold text-sky-600">Live Network</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />

            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-sky-950 leading-tight">{user?.name}</p>
              <p className="text-xs text-sky-600/90 leading-tight font-medium">
                {user?.role || user?.department || "Campus Portal"}
              </p>
            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-sky-200 bg-white hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-sky-700 text-sm font-semibold transition-all duration-200 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-50/70">
          <Outlet />
        </main>
        <EngagementPrompt />
      </div>
    </div>
  );
}
