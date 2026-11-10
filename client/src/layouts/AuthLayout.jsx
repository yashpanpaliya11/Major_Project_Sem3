import React from "react";
import { Outlet } from "react-router-dom";
import { GraduationCap } from "lucide-react";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-sky-50/40 to-blue-50/60 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Soft Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-sky-200/25 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[450px] h-[450px] rounded-full bg-blue-200/20 blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25 text-white mb-4">
          <GraduationCap className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-sky-950">
          Edu<span className="text-sky-500">Pulse</span>
        </h2>
        <p className="mt-2 text-sm text-sky-600 font-medium max-w-xs mx-auto">
          Smart Educational Data Management &amp; Anti-Proxy Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10 px-4">
        <div className="bg-white/95 py-8 px-6 shadow-xl shadow-sky-900/5 border border-sky-100 rounded-3xl sm:px-10 backdrop-blur-xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
