import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Mail, Lock, Building2, Hash, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "STUDENT",
    department: "Computer Science",
    rollNumber: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const user = await register(formData);
      if (user.role === "ADMIN") navigate("/admin");
      else if (user.role === "FACULTY") navigate("/faculty");
      else navigate("/student");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-sky-950 tracking-tight">Create an account</h3>
        <p className="text-xs text-sky-600/80 mt-1">
          Join the EduPulse digital campus attendance network.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role selector */}
        <div>
          <label className="block text-xs font-semibold text-sky-900 mb-1.5">
            Account role
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {["STUDENT", "FACULTY"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFormData({ ...formData, role: r })}
                className={`py-2.5 px-3 rounded-xl border text-xs font-bold capitalize transition-all duration-200 ${
                  formData.role === r
                    ? "bg-sky-50 text-sky-700 border-sky-300 shadow-sm"
                    : "bg-white text-slate-500 border-sky-100 hover:text-sky-700 hover:border-sky-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-sky-900 mb-1.5">
            Full name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Aarav Sharma"
              required
              autoComplete="name"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-sky-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-sky-900 mb-1.5">
            Institutional email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="name@edupulse.com"
              required
              autoComplete="email"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-sky-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-sky-900 mb-1.5">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="At least 8 characters"
              minLength={8}
              required
              autoComplete="new-password"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-sky-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-sky-900 mb-1.5">
            Department
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-sky-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 appearance-none cursor-pointer transition"
            >
              <option value="Computer Science">Computer Science</option>
              <option value="Electronics & Comm">Electronics & Comm</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Mechanical Eng">Mechanical Eng</option>
            </select>
            <svg
              className="w-4 h-4 text-sky-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 12.02l3.71-4.83a.75.75 0 111.08 1.04l-4.25 5.5a.75.75 0 01-1.08 0l-4.25-5.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {formData.role === "STUDENT" && (
          <div>
            <label className="block text-xs font-semibold text-sky-900 mb-1.5">
              Roll number
            </label>
            <div className="relative">
              <Hash className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder="e.g. 2024CS99"
                required
                autoComplete="off"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-sky-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center py-2.5"
        >
          {loading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  fill="currentColor"
                />
              </svg>
              Creating account...
            </>
          ) : (
            <>
              Complete Registration
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-slate-500 mt-4">
        Already have an account?{" "}
        <Link to="/login" className="text-sky-600 font-bold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
