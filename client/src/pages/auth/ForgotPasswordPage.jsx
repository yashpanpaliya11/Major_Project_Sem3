import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your university email');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      toast.success('Reset instructions dispatched to institutional email');
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-sky-950 tracking-tight">Reset Password</h3>
        <p className="text-xs text-sky-600 mt-1 font-medium">
          Enter your university credentials to receive a recovery token.
        </p>
      </div>

      {submitted ? (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-900">Recovery Link Sent</h4>
            <p className="text-xs text-emerald-700 mt-1.5 leading-relaxed font-medium">
              If an account with <span className="font-bold">{email}</span> exists,
              an encrypted one-time reset link has been dispatched.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to sign in
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-sky-900 mb-1.5">
              University Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rollnumber@univ.edu or faculty@edupulse.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-sky-200 rounded-xl text-sm text-slate-800 placeholder-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-500 shadow-sm transition"
              />
            </div>
          </div>

          <div className="p-3 bg-sky-50/60 border border-sky-100 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-sky-700 font-medium leading-relaxed">
              Institutional security policy: password resets require administrative approval or
              active institutional domain verification.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center"
          >
            {loading ? 'Transmitting Request...' : 'Send Recovery Link'}
          </button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs text-sky-600 hover:text-sky-800 font-semibold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
