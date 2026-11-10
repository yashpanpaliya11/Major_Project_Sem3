import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  GraduationCap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);

      if (user.role === "ADMIN") navigate("/admin");
      else if (user.role === "FACULTY") navigate("/faculty");
      else navigate("/student");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid credentials provided");
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    toast.success(`Loaded credentials for ${demoEmail.split("@")[0]}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-sky-950 tracking-tight">Welcome back</h3>
        <p className="text-xs text-sky-600 mt-1 font-medium">
          Sign in to access your digital attendance dashboard.
        </p>
      </div>

      {/* Demo credentials */}
      <div className="p-3.5 bg-sky-50/60 border border-sky-100 rounded-2xl space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-sky-600 block">
          Quick fill — demo credentials:
        </span>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setDemoCredentials("admin@edupulse.com", "admin123")}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-white border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 shadow-sm transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin
          </button>
          <button
            type="button"
            onClick={() => setDemoCredentials("faculty1@edupulse.com", "faculty123")}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-white border border-amber-200 text-amber-600 text-xs font-bold hover:bg-amber-50 shadow-sm transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Faculty
          </button>
          <button
            type="button"
            onClick={() => setDemoCredentials("student1@edupulse.com", "student123")}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-white border border-sky-200 text-sky-600 text-xs font-bold hover:bg-sky-50 shadow-sm transition-colors"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Student
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-sky-900 mb-1.5">
            Institutional Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@edupulse.com"
              required
              autoComplete="email"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-sky-200 rounded-xl text-sm text-slate-800 placeholder-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-500 shadow-sm transition"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-sky-900">Password</label>
            <Link
              to="/forgot-password"
              className="text-xs text-sky-500 hover:text-sky-700 font-semibold"
            >
              Forgot?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-sky-200 rounded-xl text-sm text-slate-800 placeholder-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-500 shadow-sm transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full justify-center py-2.5"
        >
          {loading ? (
            <>
              <svg
                className="w-4 h-4 animate-spin mr-2"
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
              Authenticating...
            </>
          ) : (
            <>
              Sign In to EduPulse
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-sky-600 font-medium mt-4">
        New to EduPulse?{" "}
        <Link
          to="/register"
          className="text-sky-500 hover:text-sky-700 font-bold ml-1 hover:underline"
        >
          Create student account
        </Link>
      </p>
    </div>
  );
}
